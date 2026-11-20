// The homepage's choices that change with the stock: which car is featured,
// which of its photos fills the hero, and the sell band's photo. Read from
// data/site.json (made by the import script); with a database, the featured
// car and its hero settings come from the "settings" collection (set in the
// admin) instead.
import fs from "node:fs/promises";
import path from "node:path";
import type { Photo } from "./photos.ts";
import { db, hasDb } from "./db.ts";

export interface SitePhotos {
  /** Slug of the featured car. */
  featured?: string;
  /** Which of the featured car's photos fills the hero (0 = its cover). */
  heroPhoto?: number;
  /** CSS object-position for the hero: the hero is cropped top and bottom only. */
  heroFocus?: string;
  sell?: Photo;
}

type Featured = Pick<SitePhotos, "featured" | "heroPhoto" | "heroFocus">;
const settings = async () => (await db()).collection<Featured & { _id: string }>("settings");

export async function getSitePhotos(): Promise<SitePhotos> {
  const file = path.join(process.env.DATA_DIR || path.resolve("data"), "site.json");
  const site: SitePhotos = JSON.parse(await fs.readFile(file, "utf8").catch(() => "{}"));
  if (!hasDb()) return site;
  const saved = await (await settings()).findOne({ _id: "site" }, { projection: { _id: 0 } });
  return { ...site, ...saved };
}

/** Features a car on the homepage (its cover fills the hero), or none. */
export async function setFeatured(slug: string | undefined, hero?: Omit<Featured, "featured">): Promise<void> {
  await (await settings()).updateOne(
    { _id: "site" },
    { $set: { featured: slug, heroPhoto: hero?.heroPhoto ?? 0, heroFocus: hero?.heroFocus ?? "50% 50%" } },
    { upsert: true },
  );
}
