// Photos uploaded in the admin. Each original is saved privately (DATA_DIR/
// originals/<car>/, never served: it may carry the camera's location), noted
// on the car as pending, and made web-ready in the background by one worker,
// one photo at a time (encoding is heavy; one at a time keeps the site
// responsive). A restart picks up where it stopped: the pending list is in
// the database and the originals are on disk.
import "./env.ts";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "./db.ts";
import { addPending, addPhoto, dropPending, type Car } from "./cars.ts";
import { describeLater } from "./photo-alt.ts";
import { processPhoto, photoStore, type Photo } from "./photos.ts";

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
/** Photos taken in one save, as on London LHD Centre v1 (nginx's upload limit is sized for it: README). */
export const MAX_UPLOAD_COUNT = 20;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "image/avif": "avif",
};

/** Car ids are made here or by the import script: letters and digits only. */
const SAFE_ID = /^[a-z0-9]+$/i;

const originalsDir = (carId: string) =>
  path.join(process.env.DATA_DIR || path.resolve("data"), "originals", carId);

/** Which of these files can be taken, and why not for the others. */
export function checkUploads(files: File[]): { ok: File[]; refused: string[] } {
  const ok: File[] = [];
  const refused: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith("image/")) refused.push(`${f.name}: not a photo`);
    else if (f.size > MAX_UPLOAD_BYTES) refused.push(`${f.name}: over 30 MB`);
    else if (ok.length >= MAX_UPLOAD_COUNT) refused.push(`${f.name}: ${MAX_UPLOAD_COUNT} photos at a time; add it after saving`);
    else ok.push(f);
  }
  return { ok, refused };
}

/** Saves the originals, notes them on the car as pending and starts the worker. */
export async function queuePhotos(carId: string, files: File[]): Promise<void> {
  if (!SAFE_ID.test(carId) || !files.length) return;
  const dir = originalsDir(carId);
  await fs.mkdir(dir, { recursive: true });
  const items = [];
  for (const f of files) {
    const id = `p${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
    const file = `${id}.${EXT[f.type] ?? "img"}`;
    await fs.writeFile(path.join(dir, file), Buffer.from(await f.arrayBuffer()));
    items.push({ id, name: f.name.slice(0, 120), file });
  }
  await addPending(carId, items);
  startPhotoWork();
}

let running = false;

/** Makes pending photos web-ready until none are left. Safe to call often. */
export function startPhotoWork(): void {
  if (running) return;
  running = true;
  work()
    .catch((e) => console.error("photo worker:", e instanceof Error ? e.message : e))
    .finally(() => {
      running = false;
    });
}

async function work() {
  const cars = (await db()).collection<Car & { _id: string }>("cars");
  for (;;) {
    const car = await cars.findOne({ "pending.0": { $exists: true } }, { projection: { _id: 1, pending: { $slice: 1 } } });
    const next = car?.pending?.[0];
    if (!car || !next) return;
    const carId = String(car._id);
    const original = path.join(originalsDir(carId), path.basename(next.file));
    try {
      const photo = await processPhoto(original, photoStore(), carId, next.id);
      await addPhoto(carId, photo, next.id);
      // Its alt text, in the background (when AI is set up).
      void describeLater(carId).catch(() => {});
    } catch (e) {
      // Not a photo sharp can read (or the original is gone): drop it.
      console.error(`photo ${next.id} of ${carId} failed:`, e instanceof Error ? e.message : e);
      await dropPending(carId, next.id);
    }
  }
}

/** Deletes a photo's web-ready files and its original. */
export async function deletePhotoFiles(carId: string, photo: Photo): Promise<void> {
  if (!SAFE_ID.test(carId)) return;
  const store = photoStore();
  for (const v of [...photo.avif, ...photo.jpg]) {
    await fs.rm(path.join(store.dir, carId, path.basename(v.url)), { force: true });
  }
  const dir = originalsDir(carId);
  const originals = await fs.readdir(dir).catch(() => [] as string[]);
  for (const f of originals) if (f.startsWith(`${photo.id}.`)) await fs.rm(path.join(dir, f), { force: true });
}

/** Deletes all of a car's photo files and originals. */
export async function deleteCarFiles(carId: string): Promise<void> {
  if (!SAFE_ID.test(carId)) return;
  await fs.rm(path.join(photoStore().dir, carId), { recursive: true, force: true });
  await fs.rm(originalsDir(carId), { recursive: true, force: true });
}
