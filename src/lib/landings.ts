// Landing pages: "Sell your Porsche 911" at /sell-your-porsche-911 (layout A
// from the landing page mockups), one per make and model, written in the
// admin (with AI Assist) and kept in the "landings" collection. The page
// itself: src/pages/[landing].astro. Its hero photo is uploaded here, or else
// a car of that make from stock.
import crypto from "node:crypto";
import type { Photo } from "./photos.ts";
import { processPhoto, photoStore } from "./photos.ts";
import { deletePhotoFiles, deleteCarFiles, MAX_UPLOAD_BYTES } from "./photo-queue.ts";
import { makeSlug } from "./cars.ts";
import { db, hasDb } from "./db.ts";

export interface Landing {
  id: string;
  /** "sell-your-porsche-911": the page's address, without the slash. */
  slug: string;
  make: string;
  model: string;
  status: "draft" | "published";
  /** One or two sentences under the heading's photo, and for Google. */
  summary: string;
  /** What buyers look for in this model; paragraphs. */
  overview: string;
  /** One per line, "Title: one line about it". */
  factors: string;
  /** Getting the best price; paragraphs. */
  tips: string;
  photo?: Photo;
  photoAlt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LandingErrors = Partial<Record<"make" | "model" | "photo", string>>;

const landings = async () => (await db()).collection<Landing & { _id: string }>("landings");
const NO_ID = { projection: { _id: 0 } } as const;

export const landingName = (l: Pick<Landing, "make" | "model">) => `${l.make} ${l.model}`;
export const landingSlug = (make: string, model: string) => `sell-your-${makeSlug(`${make} ${model}`)}`;

/** A published page, by its address. */
export async function getLanding(slug: string): Promise<Landing | undefined> {
  if (!hasDb() || !/^sell-your-[a-z0-9-]+$/.test(slug)) return undefined;
  return (await (await landings()).findOne({ slug, status: "published" }, NO_ID)) ?? undefined;
}

export async function listLandings(): Promise<Landing[]> {
  if (!hasDb()) return [];
  return (await landings()).find({}, NO_ID).sort({ make: 1, model: 1 }).toArray();
}

export async function adminLanding(id: string): Promise<Landing | undefined> {
  return (await (await landings()).findOne({ _id: id }, NO_ID)) ?? undefined;
}

export const newLandingId = () => `l${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;

/** "Title: text" lines as pairs; a line without a colon is a title alone. */
export function factorList(text: string): { title: string; text: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { title: l, text: "" };
    });
}

const text = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

/**
 * The admin form on top of the page as it was. The address is made from the
 * make and model when the page is new, and kept after that so links don't break.
 */
export async function readLandingForm(form: FormData, base: Landing): Promise<{ landing: Landing; errors: LandingErrors }> {
  const landing: Landing = {
    ...base,
    make: text(form, "make", 60),
    model: text(form, "model", 80),
    status: form.get("status") === "published" ? "published" : "draft",
    summary: text(form, "summary", 300),
    overview: text(form, "overview", 8000),
    factors: text(form, "factors", 4000),
    tips: text(form, "tips", 8000),
    photoAlt: text(form, "photoAlt", 200) || undefined,
  };
  const errors: LandingErrors = {};
  if (!landing.make) errors.make = "Enter the make";
  if (!landing.model) errors.model = "Enter the model";
  if (!base.slug && landing.make && landing.model) {
    const slug = landingSlug(landing.make, landing.model);
    const taken = await (await landings()).findOne({ slug, _id: { $ne: base.id } });
    if (taken) errors.model = `There's already a page for the ${landingName(landing)}`;
    landing.slug = slug;
  }

  const file = form.get("photo");
  if (file instanceof File && file.size > 0 && !Object.keys(errors).length) {
    if (!file.type.startsWith("image/")) errors.photo = "That isn't a photo";
    else if (file.size > MAX_UPLOAD_BYTES) errors.photo = "Choose a photo under 30 MB";
    else {
      try {
        const photo = await processPhoto(Buffer.from(await file.arrayBuffer()), photoStore(), base.id, `hero${Date.now().toString(36)}`);
        if (base.photo) await deletePhotoFiles(base.id, base.photo);
        landing.photo = photo;
      } catch {
        errors.photo = "That photo couldn't be read. Try a JPG.";
      }
    }
  } else if (form.get("removePhoto") === "on" && base.photo) {
    await deletePhotoFiles(base.id, base.photo);
    landing.photo = undefined;
  }
  return { landing, errors };
}

export async function saveLanding(l: Landing): Promise<void> {
  const { createdAt: _c, updatedAt: _u, ...rest } = l;
  const now = new Date().toISOString();
  await (await landings()).updateOne(
    { _id: l.id },
    { $set: { ...rest, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

export async function deleteLanding(id: string): Promise<void> {
  await (await landings()).deleteOne({ _id: id });
  await deleteCarFiles(id);
}
