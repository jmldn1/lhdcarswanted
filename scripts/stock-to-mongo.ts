// Copies the test stock from data/cars.json (made by stock:import-mercury)
// into this site's own database, and the featured car from data/site.json.
// Only adds cars that aren't there yet, so it never overwrites the admin's
// changes. Needs MONGODB_URI (in .env).
//
//   npm run stock:to-mongo
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db.ts";
import type { Car } from "../src/lib/cars.ts";

const dataDir = process.env.DATA_DIR || path.resolve("data");
const cars: Car[] = JSON.parse(await fs.readFile(path.join(dataDir, "cars.json"), "utf8"));
const site = JSON.parse(await fs.readFile(path.join(dataDir, "site.json"), "utf8").catch(() => "{}"));

const database = await db();
const col = database.collection<Car & { _id: string }>("cars");
// The file lists the newest first: give them times in that order.
const start = Date.now();
let added = 0;
for (const [i, car] of cars.entries()) {
  const at = new Date(start - i * 60_000).toISOString();
  const res = await col.updateOne(
    { _id: car.id },
    { $setOnInsert: { ...car, pending: [], createdAt: at, updatedAt: at } },
    { upsert: true },
  );
  if (res.upsertedCount) added++;
}
await col.createIndex({ slug: 1 }, { unique: true });
await col.createIndex({ status: 1, createdAt: -1 });

if (site.featured) {
  await database.collection<{ _id: string }>("settings").updateOne(
    { _id: "site" },
    { $setOnInsert: { featured: site.featured, heroPhoto: site.heroPhoto ?? 0, heroFocus: site.heroFocus ?? "50% 50%" } },
    { upsert: true },
  );
}
console.log(`${added} of ${cars.length} cars added to the "${database.databaseName}" database.`);
process.exit(0);
