// A photo a seller sent with a sell request: only for the signed-in admin
// (the middleware checks), never cached, and only files this site saved.
import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import { leadPhotoPath } from "../../../lib/leads.ts";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", heic: "image/heic", heif: "image/heif",
};

export const GET: APIRoute = async ({ url }) => {
  const kind = url.searchParams.get("kind") ?? "";
  const id = url.searchParams.get("id") ?? "";
  const file = url.searchParams.get("file") ?? "";
  const p = leadPhotoPath(kind, id, file);
  if (!p) return new Response("Not found", { status: 404 });
  const data = await fs.readFile(p).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = file.split(".").pop() ?? "";
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": TYPES[ext] ?? "application/octet-stream",
      "content-disposition": TYPES[ext] ? "inline" : "attachment",
      "x-content-type-options": "nosniff",
    },
  });
};
