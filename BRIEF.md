# LHD Cars Wanted: project brief

A fresh build of lhdcarswanted.co.uk by AutoGalleria, replacing the current
site. Started 18 November 2026.

## Where it comes from

- **Code:** a copy of the London LHD Centre v2 project
  (`C:\Users\lhdca\Projects\londonlhd-v2`) as it stood on 18 November 2026:
  Astro 7, Node 26, Tailwind 4, sharp, the brand file system, /cars with the
  quick look, the car page and the photo pipeline. London LHD Centre's brand
  and its test stock were left out; LHD Cars Wanted has its own brand file.
- **Not from mercury:** the current site's code (the "mercury" repository on
  GitHub) is not the starting point. It may still be read for its URLs, data
  shapes and anything worth keeping.
- **Shared parts drift:** the two projects are now separate copies. When a
  shared part (photo pipeline, /cars, car page, brand system, layout) is fixed
  or improved in one, carry the change to the other by hand, and note it in
  both commit messages. If both sites go live on this code, pull the shared
  parts into one package then.

## The current site (looked at from outside, 18 Nov 2026)

- "LHD Cars Wanted", a dealer that sells cars and buys them (sell your car,
  free valuation, part exchange).
- Pages: Home, Cars For Sale, Videos, Sell Your Car, About, Contact, search;
  footer Blog, Sitemap, Terms, Privacy. Facebook, X, Instagram, WhatsApp.
- Claims on it: finance, part exchange, a standard warranty with extensions,
  online reservation with a refundable deposit, test drives, cars inspected
  and serviced before sale. **None confirmed yet.**
- **Confirmed by the client (18 Nov 2026), for buying cars:** a free
  valuation, top cash prices paid, outstanding finance settled, secure
  payment and free UK collection. Homepage sell band: "Got a car to sell? Get
  a free valuation today".
- Signs it's unfinished: the phone number is a sample (+44 123 456 7890), the
  featured Porsche 993 links to a Porsche 356 page, the footer says © 2025.
- Its pages are on Google, so their URLs must be kept or redirected one by one.

## Rules carried over from v2

- **Photos:** kept whole, never cropped on disk; AVIF plus a JPG fallback;
  any framing happens on the page.
- **Copy:** only facts the client has confirmed; placeholders in [BRACKETS]
  until then. No full stops on headings unless the client wants them.
- **Own everything:** own database, photos, `.env`, email sender and GitHub
  repository. Nothing shared with London LHD Centre.

## Decisions to make

1. **Look:** *decided 18 Nov 2026:* carry over the v2 mockups
   (https://claude.ai/artifact/43KP51TV75miubnihbbhW5): Barlow Condensed and
   Source Sans 3, square corners, thin borders, lots of white space, whole car
   photos. The homepage starts from concept C as last changed: a short
   full-width hero cropped only top and bottom, the text kept in the hero on
   phones too, a featured car bar, then makes, cars, the sell band, services
   and the showroom. **Still open:** LHD Cars Wanted's own colours and logo
   (the mockups use London LHD Centre's steel blue and wordmark).
2. **Facts:** the real phone and WhatsApp numbers, address, opening hours,
   and which claims (finance, warranty, reservations, part exchange,
   inspections) are true.
3. **Pages for the first release:** /cars and car pages exist. Which of
   homepage, sell your car, videos, search, about, contact, blog, terms and
   privacy come first? Videos and search aren't in the v2 code yet.
4. **Old site:** *decided 18 Nov 2026:* mercury's cars and the other photos
   in its repository can be used for test stock, placeholders and heroes.
   Its car records are in its database (not connected to), so the details
   were read from the old site's public car pages. Its photos are 1200px
   copies already cut to 16:9, fine for development but not for the live
   site. Its `public/uploads` (photos customers sent with sell requests) is
   left out. Redirects to note so far: `/cars/porsche-356` (the 993) to
   `/cars/porsche-993`. **Still open:** leads, and the stock for launch.
5. **Hosting:** the same VPS as London LHD Centre (its own PM2 app, nginx
   site and database) or somewhere else. The VPS's Node version must be
   22.23.4 or newer for Astro 7.
6. **GitHub:** *done 18 Nov 2026:* https://github.com/jmldn1/lhdcarswanted
   (`main`).

## First steps (once the decisions above allow)

1. ~~Commit this starting point and connect the new GitHub repository.~~
   Done 18 Nov 2026.
2. ~~Test stock~~ Done 18 Nov 2026: the old site's three cars (911 GT3 RS,
   650S Spider, 993) plus a test F355, from mercury's photos.
3. ~~Homepage from mockup C~~ Built 18 Nov 2026 with placeholder colours and
   copy. Still to do: colours and logo (see decision 1).
4. ~~MongoDB stock and the admin~~ Built 20 Nov 2026 from the admin mockups
   (https://claude.ai/artifact/FqtX5qVva7XhWZyhMEX8eZ): /admin with one
   password (hash in .env), cars (draft / for sale / reserved / sold,
   gearbox, engine, steering, featured on the homepage, photos uploaded and
   made web-ready in the background) and leads (sell requests and
   enquiries, with a stage and notes). Cars are in this site's own MongoDB
   database (`lhdcarswanted`); leads stay as files in `LEADS_DIR`. Not built
   yet: cars wanted and settings. Page photos *built 21 Nov 2026* (Admin,
   Photos): a simpler take on v1's hero library. Each big photo (homepage
   hero and sell band, Sell your car, About's two) shows a car from stock
   until one is uploaded for it, with a tapped focus point and previews of
   the crops.
7. Blog, About and Contact: built 20 Nov 2026 from the mockups
   (https://claude.ai/artifact/313rhG5NV8wtcR9D6iDMHQ). Posts are written in
   the admin (Blog) and kept in the database; Contact messages go to the
   admin's Leads (Messages). The menu gains Blog, About and Contact, behind
   a Menu button on phones. **Waiting on the client:** the About words
   (who, story, numbers, what you sell), real Google reviews, reply time,
   address and opening hours (then a map), and the blog's first posts.
   Not built yet: photos inside a post (only a cover), the privacy page.
5. ~~Sell your car form~~ Built 18 Nov 2026 at /sell-your-car from the mockup
   (https://claude.ai/artifact/Uni1eTfYZGwYM2N36RqUNv), to be refined. It
   saves each request to `LEADS_DIR`; still to do: email each one to the
   dealer (needs this site's own email sender), and the client's answers on
   reply time, promises, payment and collection, and whether they buy right
   hand drive cars. Then the remaining pages (privacy first: the form links
   to it), then redirects from every old URL.
6. Car page photos: built 19 Nov 2026 with a row of thumbnails under the
   main photo and full-screen viewing with lightGallery 2.9.0, as on London
   LHD Centre v1. **Before launch:** the npm build is the free GPLv3 one,
   which is for development; a business website needs a lightGallery
   commercial licence (its key then goes in the `licenseKey` setting), or
   the full screen switches to a free one such as PhotoSwipe.
9. Landing pages, *built 21 Nov 2026* from mockup A
   (https://claude.ai/artifact/DCFKBA3nNR4dsbjZ9G5HAD): "Sell your Porsche
   911" at /sell-your-porsche-911, one per make and model, added in Admin,
   Landing (AI Assist drafts the words, to be checked). The form saves a sell
   request noting the page. The hero is mockup D2 *(built 21 Nov 2026)*:
   registration first, as on AutoGalleria (DVLA and MOT lookup, then where
   to reply; a plate the DVLA doesn't know offers the non-UK route), all
   inside a hero of fixed height; the full form shows without JavaScript or
   the lookup's keys. The keys in `.env` are AutoGalleria's for now: replace
   them with this site's own before launch (nginx must pass `X-Real-IP` for
   the lookup's per-visitor limit). **Waiting on the client:** the questions' answers
   (foreign plates, payment, non-runners) in the brand file, and which makes
   and models to add. Not built: make pages (mockup C), links to the landing
   pages from /sell-your-car, a sitemap.
8. Photo uploads on the VPS, *decided 21 Nov 2026:* do as London LHD Centre
   v1 does. Up to 20 photos (30 MB each) go up with a new car's Save
   (more are added after saving, one at a time); they're made web-ready in
   the background. nginx must allow that size of request and its timeouts,
   or uploads fail: use the same `client_max_body_size` and `proxy_*_timeout`
   values as v1's preview site. **Waiting on:** those values, from
   `sudo nginx -T | grep -n "client_max_body_size\|proxy_.*timeout"` on the
   VPS (README, "The admin").
