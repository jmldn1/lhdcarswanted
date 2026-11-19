// Stock. For now it's read from a JSON file made by the import script; the
// MongoDB version (v2's own database, never the live one) will keep these
// same functions so pages don't change.
import fs from "node:fs/promises";
import path from "node:path";
import type { Photo } from "./photos.ts";

export interface Car {
  id: string;
  slug: string;
  make: string;
  model: string;
  year?: string;
  mileage?: string;
  colour?: string;
  registered?: string;
  /** Pounds; null shows as POA. */
  price: number | null;
  description: string;
  status: "available" | "reserved" | "sold";
  photos: Photo[];
}

const dataFile = () => path.join(process.env.DATA_DIR || path.resolve("data"), "cars.json");

let cache: { mtime: number; cars: Car[] } | null = null;

export async function listCars(): Promise<Car[]> {
  const file = dataFile();
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) return [];
  if (cache?.mtime !== stat.mtimeMs) {
    cache = { mtime: stat.mtimeMs, cars: JSON.parse(await fs.readFile(file, "utf8")) };
  }
  return cache.cars;
}

export async function getCar(slug: string): Promise<Car | undefined> {
  return (await listCars()).find((c) => c.slug === slug);
}

/** "2018 · 51,700 miles · Silver · reg. Czech Republic" */
export function specsLine(c: Car): string {
  // Title case, but short words already in capitals stay so ("GP White").
  const nice = (s: string) =>
    s.length <= 3
      ? s.toUpperCase()
      : s.replace(/\S+/g, (w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()));
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
