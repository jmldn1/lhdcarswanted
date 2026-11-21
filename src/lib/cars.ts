// Stock, from this site's own MongoDB database (the "cars" collection, kept
// by the admin). Without a database (MONGODB_URI unset) the public pages
// read data/cars.json, made by the import script, instead. Drafts never
// reach the public pages.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Photo } from "./photos.ts";
import type { CarVideo } from "./video.ts";
import { db, hasDb } from "./db.ts";

export type CarStatus = "draft" | "available" | "reserved" | "sold";
/** An uploaded photo waiting to be made web-ready: its id, the name it was sent with, its original's file name. */
export interface Pending {
  id: string;
  name: string;
  file: string;
}

export interface Car {
  id: string;
  slug: string;
  make: string;
  model: string;
  year?: string;
  mileage?: string;
  colour?: string;
  registered?: string;
  gearbox?: "Manual" | "Automatic";
  /** Free text, e.g. "3.8 litre". */
  engine?: string;
  steering?: "LHD" | "RHD";
  /** Pounds; null shows as POA. */
  price: number | null;
  description: string;
  status: CarStatus;
  photos: Photo[];
  /** A walkaround video (a YouTube or Vimeo link, or a video file's address). */
  video?: CarVideo;
  /** Photos uploaded but not web-ready yet (the admin shows them). */
  pending?: Pending[];
  createdAt?: string;
  updatedAt?: string;
}

export const STATUS_LABEL: Record<CarStatus, string> = {
  draft: "Draft",
  available: "For sale",
  reserved: "Reserved",
  sold: "Sold",
};
export const STEERING_LABEL = { LHD: "Left hand drive", RHD: "Right hand drive" } as const;

const cars = async () => (await db()).collection<Car & { _id: string }>("cars");
const NO_ID = { projection: { _id: 0 } } as const;

const dataFile = () => path.join(process.env.DATA_DIR || path.resolve("data"), "cars.json");
let cache: { mtime: number; cars: Car[] } | null = null;
async function fromFile(): Promise<Car[]> {
  const file = dataFile();
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) return [];
  if (cache?.mtime !== stat.mtimeMs) {
    cache = { mtime: stat.mtimeMs, cars: JSON.parse(await fs.readFile(file, "utf8")) };
  }
  return cache.cars;
}

/** The cars on the site (no drafts), newest first. */
export async function listCars(): Promise<Car[]> {
  if (!hasDb()) return (await fromFile()).filter((c) => c.status !== "draft");
  return (await cars()).find({ status: { $ne: "draft" } }, NO_ID).sort({ createdAt: -1 }).toArray();
}

/** A car on the site (not a draft). */
export async function getCar(slug: string): Promise<Car | undefined> {
  if (!hasDb()) return (await listCars()).find((c) => c.slug === slug);
  return (await (await cars()).findOne({ slug, status: { $ne: "draft" } }, NO_ID)) ?? undefined;
}

// The admin's side: every car, drafts included.

export async function adminCars(): Promise<Car[]> {
  return (await cars()).find({}, NO_ID).sort({ createdAt: -1 }).toArray();
}

export async function adminCar(id: string): Promise<Car | undefined> {
  return (await (await cars()).findOne({ _id: id }, NO_ID)) ?? undefined;
}

/** Saves the car's details (not its photos, which have their own updates). */
export async function saveCar(car: Car): Promise<void> {
  const { photos: _p, pending: _q, createdAt: _c, updatedAt: _u, ...details } = car;
  const now = new Date().toISOString();
  await (await cars()).updateOne(
    { _id: car.id },
    { $set: { ...details, updatedAt: now }, $setOnInsert: { photos: [], pending: [], createdAt: now } },
    { upsert: true },
  );
}

export async function deleteCar(id: string): Promise<void> {
  await (await cars()).deleteOne({ _id: id });
}

export async function addPhoto(id: string, photo: Photo, pendingId: string): Promise<void> {
  await (await cars()).updateOne(
    { _id: id },
    { $push: { photos: photo }, $pull: { pending: { id: pendingId } }, $set: { updatedAt: new Date().toISOString() } },
  );
}

/** Sets one photo's alt text (what it shows). */
export async function setPhotoAlt(id: string, photoId: string, alt: string): Promise<void> {
  await (await cars()).updateOne({ _id: id, "photos.id": photoId }, { $set: { "photos.$.alt": alt } });
}

export async function addPending(id: string, items: Pending[]): Promise<void> {
  await (await cars()).updateOne({ _id: id }, { $push: { pending: { $each: items } } });
}

export async function dropPending(id: string, pendingId: string): Promise<void> {
  await (await cars()).updateOne({ _id: id }, { $pull: { pending: { id: pendingId } } });
}

/**
 * Puts the photos in this order and takes out the removed ones; photos the
 * form didn't know about (made web-ready meanwhile) stay, at the end.
 * Returns the removed photos, for their files to be deleted.
 */
export async function setPhotos(id: string, order: string[], removed: string[]): Promise<Photo[]> {
  const car = await adminCar(id);
  if (!car) return [];
  const gone = new Set(removed);
  const byId = new Map(car.photos.map((p) => [p.id, p]));
  const listed = order.filter((pid) => !gone.has(pid)).map((pid) => byId.get(pid)).filter((p): p is Photo => Boolean(p));
  const rest = car.photos.filter((p) => !order.includes(p.id) && !gone.has(p.id));
  await (await cars()).updateOne({ _id: id }, { $set: { photos: [...listed, ...rest], updatedAt: new Date().toISOString() } });
  return car.photos.filter((p) => gone.has(p.id));
}

export const newCarId = () => `c${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;

/** A web address for a new car, from its make and model, not used by another car. */
export async function uniqueSlug(make: string, model: string): Promise<string> {
  const base = makeSlug(`${make} ${model}`) || "car";
  const taken = new Set((await (await cars()).find({}, { projection: { slug: 1 } }).toArray()).map((c) => c.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Title case, but short words already in capitals stay so ("GP White"). */
export const nice = (s: string) =>
  s.length <= 3
    ? s.toUpperCase()
    : s.replace(/\S+/g, (w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()));

/** The key facts a car's page shows, in order; only those the car has. */
export function carFacts(c: Car): [string, string][] {
  return (
    [
      ["Year", c.year],
      ["Mileage", c.mileage],
      ["Gearbox", c.gearbox],
      ["Engine", c.engine],
      ["Steering", c.steering && STEERING_LABEL[c.steering]],
      ["Colour", c.colour && nice(c.colour)],
      ["Registered", c.registered && nice(c.registered)],
    ] as [string, string | undefined][]
  ).filter((f): f is [string, string] => Boolean(f[1]));
}

/** "2018 · 51,700 miles · Silver · reg. Czech Republic" */
export function specsLine(c: Car): string {
  return [c.year, c.mileage, c.colour && nice(c.colour), c.registered && `reg. ${nice(c.registered)}`]
    .filter(Boolean)
    .join(" · ");
}

export const priceLabel = (c: Car) =>
  c.price ? `£${c.price.toLocaleString("en-GB")}` : "POA";

/** "Mercedes-Benz" → "mercedes-benz": the make in /cars?make= links. */
export const makeSlug = (make: string) =>
  make.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The makes in stock, most cars first, with how many of each. */
export function makesInStock(cars: Car[]): { make: string; slug: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of cars) counts.set(c.make, (counts.get(c.make) ?? 0) + 1);
  return [...counts]
    .map(([make, count]) => ({ make, slug: makeSlug(make), count }))
    .sort((a, b) => b.count - a.count || a.make.localeCompare(b.make));
}
