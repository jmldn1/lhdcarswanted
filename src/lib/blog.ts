// Blog posts, written in the admin and kept in this site's own database
// (the "posts" collection). The post's text uses a small, safe formatting
// set (renderBody): ## and ### headings, - and 1. lists, > quotes, **bold**,
// _italic_ and [links](https://…). Everything else is plain text: HTML in a
// post is shown as typed, never run.
import "./env.ts";
import crypto from "node:crypto";
import { db, hasDb } from "./db.ts";
import { makeSlug } from "./cars.ts";
import type { Photo } from "./photos.ts";

export interface Post {
  id: string;
  slug: string;
  title: string;
  category: string;
  /** The standfirst: the post in a sentence, under the title and on cards. */
  intro: string;
  body: string;
  cover?: Photo;
  author?: string;
  status: "draft" | "published";
  /** The date shown on the post (YYYY-MM-DD). */
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

const posts = async () => (await db()).collection<Post & { _id: string }>("posts");
const NO_ID = { projection: { _id: 0 } } as const;

/** Published posts, newest first. */
export async function listPosts(): Promise<Post[]> {
  if (!hasDb()) return [];
  return (await posts()).find({ status: "published" }, NO_ID).sort({ date: -1, createdAt: -1 }).toArray();
}

/** A published post. */
export async function getPost(slug: string): Promise<Post | undefined> {
  if (!hasDb()) return undefined;
  return (await (await posts()).findOne({ slug, status: "published" }, NO_ID)) ?? undefined;
}

export async function adminPosts(): Promise<Post[]> {
  return (await posts()).find({}, NO_ID).sort({ date: -1, createdAt: -1 }).toArray();
}

export async function adminPost(id: string): Promise<Post | undefined> {
  return (await (await posts()).findOne({ _id: id }, NO_ID)) ?? undefined;
}

export async function savePost(post: Post): Promise<void> {
  const { createdAt: _c, updatedAt: _u, ...fields } = post;
  const now = new Date().toISOString();
  await (await posts()).updateOne(
    { _id: post.id },
    { $set: { ...fields, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

export async function deletePost(id: string): Promise<void> {
  await (await posts()).deleteOne({ _id: id });
}

export const newPostId = () => `b${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;

/** A web address for a new post, from its title, not used by another post. */
export async function uniquePostSlug(title: string): Promise<string> {
  const base = makeSlug(title).slice(0, 80).replace(/-+$/, "") || "post";
  const taken = new Set((await (await posts()).find({}, { projection: { slug: 1 } }).toArray()).map((p) => p.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** The categories in use, most posts first. */
export function categories(list: Post[]): { name: string; slug: string }[] {
  const counts = new Map<string, number>();
  for (const p of list) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => ({ name, slug: makeSlug(name) }));
}

export const readMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));

export const postDate = (date: string) =>
  date ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

// The post's text → HTML. Escaped first, so nothing typed can become markup.

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function inline(text: string): string {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const url = href.replace(/&amp;/g, "&");
    // Only web, email and same-site links.
    if (!/^(https?:\/\/|mailto:|\/(?!\/))/i.test(url)) return label;
    const away = /^https?:/i.test(url) ? ' rel="noopener"' : "";
    return `<a href="${esc(url)}"${away}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,;:!?])/g, "$1<em>$2</em>");
  return s;
}

export function renderBody(md: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    para = [];
    list = null;
    quote = [];
  };
  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) {
      flush();
    } else if ((m = line.match(/^(#{2,3})\s+(.+)$/))) {
      flush();
      const tag = m[1].length === 2 ? "h2" : "h3";
      out.push(`<${tag}>${inline(m[2])}</${tag}>`);
    } else if ((m = line.match(/^[-*]\s+(.+)$/)) || (m = line.match(/^\d+[.)]\s+(.+)$/))) {
      const tag = /^\d/.test(line) ? "ol" : "ul";
      if (para.length || quote.length || (list && list.tag !== tag)) flush();
      list ??= { tag, items: [] };
      list.items.push(m[1]);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      if (para.length || list) flush();
      quote.push(m[1]);
    } else {
      if (list || quote.length) flush();
      para.push(line);
    }
  }
  flush();
  return out.join("\n");
}
