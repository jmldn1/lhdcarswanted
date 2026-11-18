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

1. **Look:** colours, fonts and logo for LHD Cars Wanted. The brand file
   holds neutral placeholders.
2. **Facts:** the real phone and WhatsApp numbers, address, opening hours,
   and which claims (finance, warranty, reservations, part exchange,
   inspections) are true.
3. **Pages for the first release:** /cars and car pages exist. Which of
   homepage, sell your car, videos, search, about, contact, blog, terms and
   privacy come first? Videos and search aren't in the v2 code yet.
4. **Old site:** read the mercury repository for its URLs (for redirects) and
   its data (cars, photos, leads), or start the stock from scratch?
5. **Hosting:** the same VPS as London LHD Centre (its own PM2 app, nginx
   site and database) or somewhere else. The VPS's Node version must be
   22.23.4 or newer for Astro 7.
6. **GitHub:** *done 18 Nov 2026:* https://github.com/jmldn1/lhdcarswanted
   (`main`).

## First steps (once the decisions above allow)

1. ~~Commit this starting point and connect the new GitHub repository.~~
   Done 18 Nov 2026.
2. Test stock: a few cars with photos the client is happy to use in
   development (not London LHD Centre's), through the photo pipeline.
3. The brand look, then the homepage (the v2 homepage mockups are a
   starting point: https://claude.ai/artifact/43KP51TV75miubnihbbhW5).
4. MongoDB stock with this site's own database, and the admin for adding cars
   with photos encoded in the background.
5. Sell your car / valuation form, then the remaining pages, then redirects
   from every old URL.
