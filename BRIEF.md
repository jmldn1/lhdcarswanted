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
4. MongoDB stock with this site's own database, and the admin for adding cars
   with photos encoded in the background.
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
