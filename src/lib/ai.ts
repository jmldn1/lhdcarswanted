// The admin's AI writing help (Anthropic's Claude): polishing a car's
// description, social media captions, photo descriptions (alt text) and
// blog posts. Everything it writes goes into the form for the admin to check
// and save; nothing is published by it.
//
// Every call goes through ask() below, so moving to another provider means
// changing this file only. Settings (.env): ANTHROPIC_API_KEY (without it the
// AI buttons don't show), AI_MODEL (default claude-opus-5-5) and
// AI_DAILY_LIMIT (requests a day, default 300: a cap on spending).
//
// The rule for every prompt: only the facts given. Nothing about the car or
// the business is invented; what's unknown stays as a [PLACEHOLDER].
import "./env.ts";
import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { brand } from "../brands/index.ts";
import { STEERING_LABEL, nice, type Car } from "./cars.ts";
import { pick, photoStore, type Photo } from "./photos.ts";

export const aiReady = () => Boolean(process.env.ANTHROPIC_API_KEY);
// AI_MODEL only if it looks like a model's name (so a stray note in .env can't break it).
const MODEL = () => {
  const m = process.env.AI_MODEL?.trim();
  return m && /^[a-z0-9][a-z0-9.@-]*$/.test(m) ? m : "claude-opus-5-5";
};

/** A message for the admin (no key, the day's limit reached, a refusal, an outage). */
export class AiError extends Error {}

// The day's count, kept in memory (it starts again when the site restarts).
let day = "";
let used = 0;
function count() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) [day, used] = [today, 0];
  const limit = Number(process.env.AI_DAILY_LIMIT) || 300;
  if (used >= limit) throw new AiError(`The AI's daily limit (${limit}) is reached. It starts again tomorrow.`);
  used++;
}

let client: Anthropic | undefined;

const RULES = `You write for ${brand.name} (${brand.domain}), a UK dealer in left hand drive cars.
Write in British English: plain, confident and specific, like an experienced dealer talking to a buyer. No hype, no clichés ("unleash", "boasts", "stunning example", "a true icon"), no exclamation marks.
Use only the facts you are given. Never invent anything about the car (history, owners, condition, service, equipment, options) or about ${brand.name} (years trading, guarantees, warranties, prices, delivery, finance, reviews). If something would help but isn't given, leave it out, or where the task says so write a placeholder in square brackets, e.g. [SERVICE HISTORY].
Headings never end with a full stop. Write "left hand drive" and "right hand drive" as three words, never hyphenated.`;

/** One request; the reply is JSON in the given shape. */
async function ask<T>(o: {
  task: string;
  schema: Record<string, unknown>;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  if (!aiReady()) throw new AiError("AI isn't set up: add ANTHROPIC_API_KEY to .env and restart the site.");
  count();
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 120_000 });
  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await client.beta.messages.create({
      model: MODEL(),
      max_tokens: 16000,
      // If the model declines (its safety checks can misfire on harmless
      // text), the API retries on a fallback model it picks.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: `${RULES}\n\n${o.task}`,
      output_config: {
        effort: o.effort ?? "medium",
        format: { type: "json_schema", schema: { ...o.schema, additionalProperties: false } },
      },
      messages: [{ role: "user", content: o.content }],
    });
  } catch (e) {
    // The details, for the server's log (never the key).
    if (e instanceof Anthropic.APIError) console.error(`AI request failed (${e.status}):`, e.message);
    if (e instanceof Anthropic.APIError && /credit balance/i.test(e.message)) {
      throw new AiError("The AI account has no credit left. Add some at platform.claude.com (Settings, Billing).");
    }
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("The AI key in .env isn't accepted. Check ANTHROPIC_API_KEY.");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("The AI is busy. Please try again in a minute.");
    if (e instanceof Anthropic.APIError) throw new AiError(`The AI didn't answer (${e.status ?? "no connection"}). Please try again.`);
    throw e;
  }
  if (res.stop_reason === "refusal") throw new AiError("The AI declined this one. Try rewording the notes.");
  if (res.stop_reason === "max_tokens") throw new AiError("The text was too long for the AI. Try a shorter piece.");
  const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
  try {
    return JSON.parse(text ?? "") as T;
  } catch {
    throw new AiError("The AI's answer came back garbled. Please try again.");
  }
}

const obj = (props: Record<string, unknown>) => ({ type: "object", properties: props, required: Object.keys(props) });
const str = { type: "string" };

/** The car's details as given in the form, one per line; only those filled in. */
function carFacts(c: Partial<Car>, withPrice = true): string {
  return [
    ["Make", c.make],
    ["Model", c.model],
    ["Year", c.year],
    ["Mileage", c.mileage],
    ["Colour", c.colour && nice(c.colour)],
    ["Registered in", c.registered],
    ["Gearbox", c.gearbox],
    ["Engine", c.engine],
    ["Steering", c.steering && STEERING_LABEL[c.steering]],
    ["Price", !withPrice ? undefined : c.price ? `£${c.price.toLocaleString("en-GB")}` : c.price === null ? "POA (price on application)" : undefined],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

// Every car's description has the same shape (as on London LHD Centre v1),
// which the car page lays out (src/lib/description.ts).
const DESCRIPTION_FORMAT = `Format (plain text, no markdown, no asterisks), with a blank line between the parts:
1. An opening paragraph of 2 or 3 sentences: what the car is and, if known, its history.
2. Only if there are at least three notable points: a line "Highlights:" then 3 to 8 lines each starting "- " (history, documents, work done, the most desirable equipment), each a short phrase.
3. A closing line inviting an enquiry, without contact details.
Never mention the price (it's shown separately and can change).`;

const DEALER_VOICE = `You are the dealer describing your own car, so state every fact directly ("It has had two owners", "It is in excellent condition"). Never attribute a fact to anyone: no "is described as", "is said to", "reportedly", "according to", "the notes say".`;

/**
 * The car's description from the admin's notes (or, with no notes, a short
 * one from the details alone). Keeps every fact in the notes; adds none
 * about the car. With `background`, it may add a sentence or two of general,
 * well-known background about the model (to be checked).
 */
export async function polishDescription(car: Partial<Car>, notes: string, background = false): Promise<string> {
  const hasNotes = Boolean(notes.trim());
  const r = await ask<{ description: string }>({
    task: `Task: write the description for this car's page on the website.
${hasNotes ? "Rewrite the dealer's notes into the description. Keep every fact in the notes, however small (owners, history, service, documents, equipment, condition, faults). Fix spelling and capitals (notes are often typed in capitals or shorthand); write model names and equipment as a person would. Add no fact about this car that isn't in the notes or the details: no invented history, condition, equipment or figures." : "There are no notes, so write from the details alone: say what the car is, and invent no history, condition, equipment or figures about it."}
${background ? "You may also add one or two sentences of general background about this model (where it sits in the range, what it's known for), in the opening paragraph, but only what you're confident is accurate for this exact model and variant, and nothing about this particular car." : "Don't add general background about the model either: only what's in the details and notes."}
${DEALER_VOICE}
${DESCRIPTION_FORMAT}
Write only the description.`,
    schema: obj({ description: str }),
    content: `Details:\n${carFacts(car, false)}\n\nNotes:\n${notes.trim().slice(0, 8000) || "(none)"}`,
  });
  // Belt and braces: plain text was asked for; drop any markdown bold.
  return r.description.replace(/\*\*/g, "").trim();
}

/** Three Instagram/Facebook caption options, to copy; nothing is posted. */
export async function socialCaptions(car: Partial<Car>, description: string): Promise<string[]> {
  const r = await ask<{ captions: string[] }>({
    task: `Task: write three different captions for an Instagram or Facebook post about this car, for the dealer to choose from and post themselves.
Each: 2 to 4 short lines; the car first; at most two emojis; then a line inviting people to get in touch or see more on the website (no phone number, no link); then 3 to 6 relevant hashtags on the last line.
Vary them: one plain and factual, one leading with what makes this car special (from the facts given), one short.`,
    schema: obj({ captions: { type: "array", items: str } }),
    content: `Details:\n${carFacts(car)}\n\nDescription:\n${description.trim().slice(0, 6000) || "(none)"}`,
    effort: "low",
  });
  return r.captions.map((c) => c.trim()).filter(Boolean).slice(0, 3);
}

/** A short description of one car photo, for screen readers and search engines. */
export async function photoAlt(car: Partial<Car>, photo: Photo): Promise<string> {
  const store = photoStore();
  const url = pick(photo.jpg, 800).url;
  const data = await fs.readFile(path.join(store.dir, url.slice(store.urlBase.length)));
  const r = await ask<{ alt: string }>({
    task: `Task: write the alt text for this photo of a car on a dealer's website: what the photo shows, for someone who can't see it.
One phrase, at most 120 characters, no full stop. Start with the car (year, make, model and colour as given), then the view or detail shown (e.g. "front three-quarter view", "dashboard and steering wheel", "rear seats", "engine bay", "service book"). Don't start with "Image of" or "Photo of". Don't include number plate characters. Don't judge condition.`,
    schema: obj({ alt: str }),
    content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") } },
      { type: "text", text: `Details:\n${carFacts(car)}` },
    ],
    effort: "low",
  });
  return r.alt.trim().replace(/\.$/, "").slice(0, 160);
}

export type BlogMode = "draft" | "polish" | "shorten" | "headline";

export interface BlogResult {
  title?: string;
  intro?: string;
  body?: string;
  titles?: string[];
}

const BLOG_FORMAT = `The body's format (the site shows these, and nothing else): paragraphs separated by a blank line; "## " for a section heading and "### " for a smaller one; lines starting "- " for a list, or "1. " for a numbered list; "> " for a quote; **bold** and _italic_; links as [words](https://…).`;

/** Help with a blog post: draft it from notes, polish or shorten it, or suggest titles. */
export async function blogAssist(mode: BlogMode, post: { title: string; intro: string; body: string }): Promise<BlogResult> {
  const given = `Title: ${post.title.trim() || "(none)"}\nIntro: ${post.intro.trim() || "(none)"}\n\nBody or notes:\n${post.body.trim().slice(0, 30000) || "(none)"}`;
  const facts = `General, well-known facts about cars, buying, selling and importing left hand drive cars are fine. Anything about ${brand.name} itself only if it's in the post or notes: how it works, what it asks sellers to send, how it values or pays, how long things take, its experience, expertise or customers, prices, numbers, guarantees. Don't write "we know…", "we deal in…every day", "send us photos", "honest valuation" or similar unless the notes say it; where the post needs such a fact, write a placeholder in square brackets instead, e.g. [HOW LONG A VALUATION TAKES]. The closing invitation to get in touch stays general.`;
  if (mode === "draft") {
    return ask<BlogResult>({
      task: `Task: write a blog post for the website from the title and notes given (the notes may be rough, in any order).
${facts}
Around 500 to 900 words, with 2 to 4 "## " sections. Write for people thinking of selling or buying a left hand drive car in the UK. End with a short paragraph inviting readers to get in touch, without contact details.
Also write the title (keep the given one if there is one, tidied) and a one- or two-sentence intro shown above the post and in search results.
${BLOG_FORMAT}`,
      schema: obj({ title: str, intro: str, body: str }),
      content: given,
    });
  }
  if (mode === "polish" || mode === "shorten") {
    return ask<BlogResult>({
      task: `Task: ${mode === "polish" ? "polish this blog post: fix spelling, grammar and flow, tighten wordy sentences and improve the headings, keeping its meaning, its facts, its structure and roughly its length" : "shorten this blog post to about two thirds of its length, keeping its main points, its facts and its headings where they still fit"}.
Don't add facts. Keep the dealer's own wording where it's already good, and keep any [PLACEHOLDERS].
${BLOG_FORMAT}
Return the whole body.`,
      schema: obj({ body: str }),
      content: given,
    });
  }
  return ask<BlogResult>({
    task: `Task: suggest three titles for this blog post (each under 65 characters, the most useful words first, no clickbait, no full stop) and one intro of one or two sentences (under 160 characters) for above the post and in search results.
${facts}`,
    schema: obj({ titles: { type: "array", items: str }, intro: str }),
    content: given,
    effort: "low",
  });
}
