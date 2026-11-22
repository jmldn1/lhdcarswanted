// The admin's AI buttons (src/lib/ai.ts) post JSON here; the middleware has
// already checked the admin is signed in. JSON only, so another site's page
// can't send one (a cross-site JSON post needs a preflight we never allow).
//
//   { task: "description", fields, background? } → { description }
//   { task: "captions", fields }           → { captions }
//   { task: "alt", carId }                 → { queued }  (in the background)
//   { task: "blog", mode, title, intro, body } → { title?, intro?, body?, titles? }
//   { task: "landing", make, model, notes }    → { summary, overview, factors, tips }
//
// `fields` are the car form's values, read as the form itself reads them.
import type { APIRoute } from "astro";
import { AiError, blogAssist, landingAssist, polishDescription, socialCaptions, type BlogMode } from "../../lib/ai.ts";
import { readCarForm } from "../../lib/car-form.ts";
import { describeLater } from "../../lib/photo-alt.ts";
import type { Car } from "../../lib/cars.ts";

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const BLANK: Car = { id: "", slug: "", make: "", model: "", price: null, description: "", status: "draft", photos: [] };

function carFrom(fields: unknown): Car {
  const form = new FormData();
  if (fields && typeof fields === "object") {
    for (const [k, v] of Object.entries(fields)) if (typeof v === "string") form.set(k, v.slice(0, 20000));
  }
  return readCarForm(form, BLANK).car;
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

export const POST: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON only" }, 415);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Not JSON" }, 400);
  }
  try {
    switch (body.task) {
      case "description": {
        const car = carFrom(body.fields);
        if (!car.make || !car.model) return json({ error: "Enter the make and model first." }, 400);
        return json({ description: await polishDescription(car, car.description, body.background === true) });
      }
      case "captions": {
        const car = carFrom(body.fields);
        if (!car.make || !car.model) return json({ error: "Enter the make and model first." }, 400);
        return json({ captions: await socialCaptions(car, car.description) });
      }
      case "alt": {
        const id = text(body.carId);
        if (!/^[a-z0-9]+$/i.test(id)) return json({ error: "No such car" }, 400);
        return json({ queued: await describeLater(id) });
      }
      case "landing": {
        const make = text(body.make).trim().slice(0, 60);
        const model = text(body.model).trim().slice(0, 80);
        if (!make || !model) return json({ error: "Enter the make and model first." }, 400);
        return json(await landingAssist(make, model, text(body.notes)));
      }
      case "blog": {
        const mode = text(body.mode) as BlogMode;
        if (!["draft", "polish", "shorten", "headline"].includes(mode)) return json({ error: "Unknown request" }, 400);
        const post = { title: text(body.title), intro: text(body.intro), body: text(body.body) };
        if (!post.title.trim() && !post.body.trim()) return json({ error: "Write a title or some notes first." }, 400);
        if ((mode === "polish" || mode === "shorten") && !post.body.trim()) return json({ error: "There's no post to work on yet." }, 400);
        return json(await blogAssist(mode, post));
      }
      default:
        return json({ error: "Unknown request" }, 400);
    }
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, 503);
    console.error("admin AI:", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};
