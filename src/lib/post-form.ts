// Reads and checks the admin's blog post form (the cover photo is handled
// by the page: src/pages/admin/blog/).
import type { Post } from "./blog.ts";

export type PostErrors = Partial<Record<"title" | "body" | "date" | "cover", string>>;

const text = (form: FormData, key: string, max = 200) => String(form.get(key) ?? "").trim().slice(0, max);
export const today = () => new Date().toISOString().slice(0, 10);

export function readPostForm(form: FormData, base: Post): { post: Post; errors: PostErrors } {
  const post: Post = {
    ...base,
    title: text(form, "title", 160),
    category: text(form, "category", 60),
    intro: text(form, "intro", 400),
    body: String(form.get("body") ?? "").trim().slice(0, 60000),
    author: text(form, "author", 80) || undefined,
    status: form.get("status") === "published" ? "published" : "draft",
    date: text(form, "date", 10) || today(),
  };
  const errors: PostErrors = {};
  if (!post.title) errors.title = "Enter a title";
  if (!post.body && post.status === "published") errors.body = "Write the post before publishing it";
  if (!/^\d{4}-\d\d-\d\d$/.test(post.date)) errors.date = "Choose a date";
  return { post, errors };
}
