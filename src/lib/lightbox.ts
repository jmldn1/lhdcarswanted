// The full-screen gallery's photos for a car, as JSON for the page to embed
// (<script type="application/json" id="lightbox-photos">). Opened by
// src/scripts/lightbox.ts. AVIF with the JPG as fallback, and a small AVIF
// for its thumbnails. Text in subHtml is HTML there, so it is escaped.
import type { Car } from "./cars.ts";
import { srcset, pick } from "./photos.ts";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function lightboxJson(car: Car): string {
  const name = `${car.make} ${car.model}`;
  const items = car.photos.map((p, i) => ({
    src: p.jpg[p.jpg.length - 1].url,
    srcset: srcset(p.jpg),
    sizes: "100vw",
    sources: [{ type: "image/avif", srcset: srcset(p.avif), sizes: "100vw" }],
    thumb: pick(p.avif, 200).url,
    alt: p.alt ?? `${name}, photo ${i + 1} of ${car.photos.length}`,
    subHtml: `<p>${esc(name)}</p>`,
  }));
  // Safe inside <script>: no "</script>" can appear.
  return JSON.stringify(items).replace(/</g, "\\u003c");
}
