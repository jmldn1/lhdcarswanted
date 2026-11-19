// Fills the site with test stock from the old site's code (the "mercury"
// repository), so pages can be built against real photos before this site
// has its own database.
//
//   node scripts/import-mercury-stock.ts <mercury checkout>/public/images
//
// mercury's car records live in its database, which we never connect to; the
// details below were read from the old site's public car pages on
// 18 Nov 2026 and still need the client's confirmation. mercury only kept
// 1200px copies, already cut to 16:9, so these photos are for development
// only: the real stock is re-photographed or re-uploaded whole.
//
// Leaves out public/uploads (photos customers sent with sell requests).
//
// Writes data/cars.json, data/site.json and public/photos/ (all git-ignored).
// Run it again to pick up changes; photos already encoded are reused.
import fs from "node:fs/promises";
import path from "node:path";
import { processPhoto, photoStore, type Photo } from "../src/lib/photos.ts";
import type { Car } from "../src/lib/cars.ts";
import type { SitePhotos } from "../src/lib/site.ts";

const [src] = process.argv.slice(2);
if (!src) {
  console.error("usage: node scripts/import-mercury-stock.ts <mercury>/public/images");
  process.exit(1);
}

type Stock = Omit<Car, "id" | "photos"> & { files: string[] };

// Photos in showing order: the first is the cover. Files with the same
// content under other names (mercury saved some sets two or three times) are
// left out.
const STOCK: Stock[] = [
  {
    slug: "porsche-911-gt3-rs",
    make: "Porsche",
    model: "911 GT3 RS",
    year: "2010",
    mileage: "17,000 miles",
    colour: "GP White",
    price: null,
    description:
      "Porsche 911 997 GT3 RS Gen II 2010 LHD. GP White exterior with Anthracite Grey lightweight sports seats with red trim and red light alloy wheels. Excellent condition inside and out with factory paint, FSH, full book pack. 3.8 litre, manual.",
    status: "available",
    files: [
      "1754063870046-911-rs-gallery-0-lg.webp",
      "1754206111444-911-rs-gallery-1-lg.webp",
      "1754206111858-911-rs-gallery-2-lg.webp",
      "1754063870477-911-rs-gallery-1-lg.webp",
      "1754063871023-911-rs-gallery-2-lg.webp",
      "1754063871395-911-rs-gallery-3-lg.webp",
      "1754063871758-911-rs-gallery-4-lg.webp",
      "1754063873340-911-rs-gallery-8-lg.webp",
      "1754063872198-911-rs-gallery-5-lg.webp",
      "1754063872548-911-rs-gallery-6-lg.webp",
      "1754063872957-911-rs-gallery-7-lg.webp",
    ],
  },
  {
    slug: "mclaren-650s",
    make: "McLaren",
    model: "650S Spider",
    year: "2015",
    mileage: "5,000 miles",
    colour: "Gunmetal Grey",
    registered: "UK",
    price: null,
    description:
      "McLaren 650S Spider 2015 LHD UK registration. Gunmetal grey with Anthracite alcantara sports interior. Super condition inside and out. FSH, full inspection carried out. Complete book pack. 3.8 litre, automatic.",
    status: "available",
    // mercury's "ferrari-330-lmb" photos are more of this car: left out.
    files: [
      "1754208678379", "1754208678981", "1754208679412", "1754208679887", "1754208680291", "1754208680731",
      "1754208681164", "1754208681612", "1754208682046", "1754208682416", "1754208682801",
    ].map((stamp, i) => `${stamp}-650s-gallery-${i}-lg.webp`),
  },
  {
    // The old site has this car at /cars/porsche-356: redirect it here.
    slug: "porsche-993",
    make: "Porsche",
    model: "993",
    year: "1997",
    mileage: "60,000 miles",
    price: 65000,
    description: "[DESCRIPTION: the old site only says \"Porsche 993\"]",
    status: "available",
    files: ["1754311244359-356-gallery-0-lg.webp"],
  },
  {
    // Not on the old site: a test car so the grid has a fourth make. Its
    // photo's source is unknown, so it must never reach the live site.
    slug: "ferrari-f355",
    make: "Ferrari",
    model: "F355",
    price: null,
    description: "[TEST CAR: not in stock, for development only]",
    status: "available",
    files: ["hero-mercedes-300-63.webp"],
  },
];

/** The homepage: the featured car, which of its photos is the hero, and the sell band's photo. */
const SITE = {
  featured: "porsche-911-gt3-rs",
  heroPhoto: 1,
  heroFocus: "50% 54%",
  sellFile: "cta-car-banner.webp",
};

const store = photoStore();
const cars: Car[] = [];

for (const [i, s] of STOCK.entries()) {
  const id = `m${String(i + 1).padStart(3, "0")}`;
  const photos: Photo[] = [];
  for (const [j, f] of s.files.entries()) {
    photos.push(await processPhoto(path.join(src, f), store, id, String(j + 1).padStart(2, "0")));
  }
  const { files: _files, ...car } = s;
  cars.push({ id, ...car, photos });
  console.log(`${i + 1}/${STOCK.length} ${s.make} ${s.model} (${photos.length} photos)`);
}

const site: SitePhotos = {
  featured: SITE.featured,
  heroPhoto: SITE.heroPhoto,
  heroFocus: SITE.heroFocus,
  sell: await processPhoto(path.join(src, SITE.sellFile), store, "site", "sell"),
};

const dataDir = process.env.DATA_DIR || path.resolve("data");
await fs.mkdir(dataDir, { recursive: true });
await fs.writeFile(path.join(dataDir, "cars.json"), JSON.stringify(cars, null, 2));
await fs.writeFile(path.join(dataDir, "site.json"), JSON.stringify(site, null, 2));
console.log(`Wrote ${cars.length} cars and the homepage photos to ${dataDir}`);
