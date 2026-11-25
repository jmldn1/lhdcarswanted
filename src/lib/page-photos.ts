// Page photos: the big photos on the homepage, Sell your car and About.
// Each place shows a photo from stock (automatic) until the admin uploads one
// for it in Admin, Page photos; then it shows that, with the point chosen to
// stay in view when a screen crops it. One photo per place, kept in the
// "settings" collection (files in PHOTO_DIR/site/); replacing or removing it
// deletes the old files.
import crypto from "node:crypto";
import type { Photo } from "./photos.ts";
import { processPhoto, photoStore } from "./photos.ts";
import { deletePhotoFiles, MAX_UPLOAD_BYTES } from "./photo-queue.ts";
import { db, hasDb } from "./db.ts";

export const PLACES = [
  { key: "homeHero", label: "Homepage: the large photo at the top", page: "/", automatic: "the featured car's photo" },
  { key: "homeSell", label: "Homepage: the \"Got a car to sell?\" band", page: "/#sell", automatic: "the standard selling photo" },
  { key: "sellSide", label: "Sell your car: the photo beside the form (not shown in the current layout)", page: "/sell-your-car", automatic: "a car from stock" },
  { key: "aboutMain", label: "About: the first photo", page: "/about", automatic: "the featured car" },
  { key: "aboutSecond", label: "About: the second photo", page: "/about", automatic: "another car from stock" },
] as const;
export type Place = (typeof PLACES)[number]["key"];
export const isPlace = (k: string): k is Place => PLACES.some((p) => p.key === k);

export interface PagePhoto {
  photo: Photo;
  /** What it shows, for screen readers and search engines. */
  alt: string;
  /** CSS object-position, "50% 40%": the point kept in view when cropped. */
  focus: string;
}
export type PagePhotos = Partial<Record<Place, PagePhoto>>;

const settings = async () => (await db()).collection<{ _id: string; pagePhotos?: PagePhotos }>("settings");
const FOLDER = "site";

/** The uploaded photo for each place (places left automatic are missing). */
export async function getPagePhotos(): Promise<PagePhotos> {
  if (!hasDb()) return {};
  return (await (await settings()).findOne({ _id: "site" }))?.pagePhotos ?? {};
}

const FOCUS = /^(\d{1,3})% (\d{1,3})%$/;
const cleanFocus = (f: string) => {
  const m = f.match(FOCUS);
  return m && Number(m[1]) <= 100 && Number(m[2]) <= 100 ? f : "50% 50%";
};

/**
 * Saves a place's photo: a new upload (replacing the old one), and/or its
 * description and focus point.
 */
export async function savePagePhoto(place: Place, o: { file?: File; alt: string; focus: string }): Promise<{ error?: string }> {
  const current = (await getPagePhotos())[place];
  let photo = current?.photo;
  if (o.file) {
    if (!o.file.type.startsWith("image/")) return { error: "That isn't a photo." };
    if (o.file.size > MAX_UPLOAD_BYTES) return { error: "Choose a photo under 30 MB." };
    try {
      photo = await processPhoto(Buffer.from(await o.file.arrayBuffer()), photoStore(), FOLDER, `${place}-${crypto.randomBytes(4).toString("hex")}`);
    } catch {
      return { error: "That photo couldn't be read. Try a JPG." };
    }
  }
  if (!photo) return { error: "Choose a photo first." };
  const value: PagePhoto = { photo, alt: o.alt.trim().slice(0, 200), focus: o.file ? "50% 50%" : cleanFocus(o.focus) };
  await (await settings()).updateOne({ _id: "site" }, { $set: { [`pagePhotos.${place}`]: value } }, { upsert: true });
  if (o.file && current) await deletePhotoFiles(FOLDER, current.photo);
  return {};
}

/** Back to automatic: the place's photo and its files go. */
export async function removePagePhoto(place: Place): Promise<void> {
  const current = (await getPagePhotos())[place];
  await (await settings()).updateOne({ _id: "site" }, { $unset: { [`pagePhotos.${place}`]: "" } });
  if (current) await deletePhotoFiles(FOLDER, current.photo);
}
