// Car photos made at runtime (uploaded in the admin) live in PHOTO_DIR, not
// in the build. nginx should serve /photos/ from PHOTO_DIR directly (see the
// README); this is the fallback when it doesn't (e.g. `npm start` locally).
// Only "<car>/<photo>-<width>.avif|jpg" names are served.
import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import { photoStore } from "../../lib/photos.ts";

const NAME = /^[a-z0-9]+\/[a-z0-9-]+\.(avif|jpg)$/i;

export const GET: APIRoute = async ({ params }) => {
  const rel = params.path ?? "";
  if (!NAME.test(rel)) return new Response("Not found", { status: 404 });
  const data = await fs.readFile(path.join(photoStore().dir, rel)).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": rel.endsWith(".avif") ? "image/avif" : "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
