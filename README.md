# LHD Cars Wanted

The new lhdcarswanted.co.uk, built with Astro 7 on Node 26 (LTS), rendered on
the server by the Node adapter. It started as a copy of the London LHD Centre
v2 code (`C:\Users\lhdca\Projects\londonlhd-v2`); see `BRIEF.md`.

## Run it

```sh
npm install
npm run dev            # http://localhost:4391/ (this site's port, as on the VPS)
BRAND=demo npm run dev # the made-up brand, to check nothing is hard-coded
npm run check          # type check
npm run build && npm start
```

## The admin (/admin)

Cars (add, edit, photos, status, featured on the homepage) and leads (sell
requests and enquiries, with a stage and private notes). It needs this
site's own MongoDB database and a password:

```sh
cp .env.example .env     # then set MONGODB_URI (and MONGODB_DB) in it
npm run admin:password   # asks for the password; writes its hash to .env
npm run stock:to-mongo   # copies the test stock from data/ into the database
```

Restart the site after changing `.env`. Without `MONGODB_URI` the public pages
read `data/cars.json` and the admin says it isn't set up.

Uploaded photos: the original is kept privately in `DATA_DIR/originals/`
(never served: it may carry the camera's location); the web versions are made
in the background, one at a time, into `PHOTO_DIR`. In production nginx
should serve `/photos/` straight from `PHOTO_DIR`:

```nginx
location /photos/ {
    alias /var/www/lhdcarswanted-dev/public/photos/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

(`src/pages/photos/[...path].ts` serves them when nginx doesn't.)

Upload size: a new car's Save sends up to 20 photos of up to 30 MB each in
one request (`MAX_UPLOAD_COUNT`, `MAX_UPLOAD_BYTES` in
`src/lib/photo-queue.ts`); an edit sends one photo per request. nginx refuses
anything over 1 MB by default, so the site's server block needs its own
values: `client_max_body_size 650M` (20 photos of 30 MB, with room to spare)
and `proxy_read_timeout`/`proxy_send_timeout 300s`. Other sites on the VPS
have 200m and 300s; which of them are London LHD Centre v1's isn't checked.
To list them all:
`sudo nginx -T | grep -n "client_max_body_size\|proxy_.*timeout"`.

Walkaround videos: a car can have a YouTube or Vimeo link, or the https
address of an .mp4/.webm file (`src/lib/video.ts`). The car's page shows one
of its photos as the poster; nothing from the video's host loads until
someone presses play, and then it plays full screen (`src/scripts/video.ts`).
If a Content-Security-Policy is ever added, it needs `frame-src
https://www.youtube-nocookie.com https://player.vimeo.com` (and `media-src`
for a file's host).

## Test stock

Test stock comes from the old site's code (the private "mercury" repository).
Clone it anywhere outside this project, then:

```sh
npm run stock:import-mercury -- <mercury>/public/images
```

**Windows:** run the dev server *and* `npm run build` from a path with a
capital drive letter (`C:\Users\...`, not `c:\Users\...`; VS Code's terminal
often opens at `c:`). Otherwise Astro hashes the two spellings differently:
in dev, components' styles silently stop applying; in a build, no page gets
its CSS at all. Linux (the VPS) has no drive letters, so it's unaffected.

## Where things are

- `src/brands/`: one file per brand (name, logo text, colours, fonts,
  contact details, features, copy, card photo framing). `BRAND` picks one;
  LHD Cars Wanted is the default. Font files per brand in `src/brands/fonts/`.
- `src/styles/global.css`: the brand colours and fonts mapped onto Tailwind.
- `src/lib/photos.ts`: the photo pipeline (sharp). Photos are never cropped on
  disk: each is kept whole (inside 2048px), as AVIF at several widths plus a
  JPG fallback. Framing happens on the page only.
- `src/lib/cars.ts`: stock, from this site's own MongoDB database
  (`src/lib/db.ts`), or `data/cars.json` without one. Drafts never reach the
  public pages.
- `src/lib/site.ts`: the homepage's featured car, hero photo and sell band
  photo (`data/site.json`; the featured car from the database when there is one).
- `src/lib/auth.ts`, `src/middleware.ts`: the admin's sign-in and its guard.
- `src/lib/photo-queue.ts`: admin photo uploads, made web-ready in the background.
- `src/pages/admin/`, `src/layouts/Admin.astro`, `src/components/admin/`: the admin.
- `src/pages/index.astro`: the homepage (v2 mockup concept C).
- `src/pages/sell-your-car.astro`: the sell form (layout A; `/sell-your-car/b` is
  layout B, to compare), saving through `src/lib/leads.ts`. Both share
  `src/components/sell/`, `src/lib/sell-form.ts`, `src/scripts/sell-form.ts` and
  `src/styles/sell-form.css`. Works without JavaScript. Its words are in the
  brand file (`copy.sell`).
- `src/pages/cars/`: /cars (grid, quick look, `?make=` filter) and the car page
  (layout A; `/cars/<car>/b` is layout B with an enquiry form, to compare).
- `src/pages/blog/`, `src/lib/blog.ts`: the blog. Posts are written in the
  admin (/admin/blog) and kept in the database; their text uses a small, safe
  formatting set (headings, lists, quotes, bold, italic, links).
- `src/pages/about.astro`, `src/pages/contact.astro`: About (words from the
  brand's `copy.about`) and Contact (its form saves to the leads' Messages).
- `scripts/import-mercury-stock.ts`: test stock from mercury's photos.

`data/` and `public/photos/` hold test stock and are git-ignored.

## Settings (.env)

| Variable | Default | What |
|---|---|---|
| `BRAND` | `lhd-cars-wanted` | Which brand file to use |
| `PHOTO_DIR` | `public/photos` | Where photos are written (served by nginx in production) |
| `PHOTO_URL` | `/photos` | URL the photo folder is served from |
| `MONGODB_URI` | (none) | This site's own MongoDB server; without it the admin is off |
| `MONGODB_DB` | `lhdcarswanted` | The database's name (never another project's) |
| `ADMIN_PASSWORD_HASH` | (none) | Set by `npm run admin:password`; never the password itself |
| `SESSION_SECRET` | (none) | Signs the admin's sign-in cookie; set by `npm run admin:password` |
| `DATA_DIR` | `data` | Test stock file and uploaded photos' originals |
| `LEADS_DIR` | `data/leads` | Where sell requests (with their photos) and enquiries are saved. Customer data: outside the app folder in production, never in git |
| `GMAIL_USER`, `GMAIL_PASS`, `GMAIL_TO` | not set: no emails | Emails each sell request, car enquiry and Contact message to `GMAIL_TO` through Gmail (`src/lib/mail.ts`); `GMAIL_PASS` is an app password |
| `ANTHROPIC_API_KEY` | (none) | The admin's AI writing help (`src/lib/ai.ts`); without it the AI buttons don't show |
| `AI_MODEL` | `claude-opus-5-5` | The Claude model the AI help uses |
| `AI_DAILY_LIMIT` | `300` | AI requests a day (a cap on spending; counts again after a restart) |
| `DVLA_API_KEY` | (none) | The landing pages' registration lookup (`src/lib/vehicle-lookup.ts`); without it they show the full form |
| `MOT_API_KEY`, `DVSA_TENANT_ID`, `DVSA_CLIENT_ID`, `DVSA_CLIENT_SECRET` | (none) | The MOT history API, for the model and the last MOT mileage; the lookup works without it, minus those |
