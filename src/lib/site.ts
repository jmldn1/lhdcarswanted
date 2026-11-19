// The homepage's choices that change with the stock: which car is featured,
// which of its photos fills the hero, and the sell band's photo. Read from
// data/site.json (made by the import script for now; the admin later).
import fs from "node:fs/promises";
import path from "node:path";
import type { Photo } from "./photos.ts";

export interface SitePhotos {
  /** Slug of the featured car. */
  featured?: string;
  /** Which of the featured car's photos fills the hero (0 = its cover). */
  heroPhoto?: number;
  /** CSS object-position for the hero: the hero is cropped top and bottom only. */
  heroFocus?: string;
  sell?: Photo;
}

export async function getSitePhotos(): Promise<SitePhotos> {
  const file = path.join(process.env.DATA_DIR || path.resolve("data"), "site.json");
  return JSON.parse(await fs.readFile(file, "utf8").catch(() => "{}"));
}
