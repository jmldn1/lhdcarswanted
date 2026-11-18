# LHD Cars Wanted

The new lhdcarswanted.co.uk, built with Astro 7 on Node 26 (LTS), rendered on
the server by the Node adapter. It started as a copy of the London LHD Centre
v2 code (`C:\Users\lhdca\Projects\londonlhd-v2`); see `BRIEF.md`.

## Run it

```sh
npm install
npm run dev            # http://localhost:4321/cars
BRAND=demo npm run dev # the made-up brand, to check nothing is hard-coded
npm run check          # type check
npm run build && npm start
```

There's no stock yet, so /cars shows the empty message until test stock is
added (see `BRIEF.md`, first steps).

## Where things are

- `src/brands/`: one file per brand (name, logo text, colours, fonts,
  contact details, features, copy, card photo framing). `BRAND` picks one;
  LHD Cars Wanted is the default. Font files per brand in `src/brands/fonts/`.
- `src/styles/global.css`: the brand colours and fonts mapped onto Tailwind.
- `src/lib/photos.ts`: the photo pipeline (sharp). Photos are never cropped on
  disk: each is kept whole (inside 2048px), as AVIF at several widths plus a
  JPG fallback. Framing happens on the page only.
- `src/lib/cars.ts`: stock. Reads `data/cars.json` for now; MongoDB (this
  site's own database) comes next with the same functions.
- `src/pages/cars/`: /cars (grid and quick look) and the car page.

`data/` and `public/photos/` hold test stock and are git-ignored.

## Settings (.env)

| Variable | Default | What |
|---|---|---|
| `BRAND` | `lhd-cars-wanted` | Which brand file to use |
| `PHOTO_DIR` | `public/photos` | Where photos are written (served by nginx in production) |
| `PHOTO_URL` | `/photos` | URL the photo folder is served from |
| `DATA_DIR` | `data` | Test stock file location |
