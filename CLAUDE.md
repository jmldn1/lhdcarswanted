# LHD Cars Wanted: rules for AI agents

Read `BRIEF.md` first. This is a fresh build of lhdcarswanted.co.uk. The
current site runs elsewhere (believed to be the "mercury" app); this project
started as a copy of `C:\Users\lhdca\Projects\londonlhd-v2`.

- **Never touch a live site from here:** don't deploy to or connect to the
  VPS, don't edit the London LHD Centre repos (v1 or v2) from this project,
  and never connect to another project's database.
- **Never print secrets** (`.env` values, connection strings, keys, tokens).
- **Customer data:** leads, valuation requests and any mailing list stay out
  of this repo and out of output. Don't use London LHD Centre's photos or data
  here.
- **Git:** stage only the files you changed (never `git add -A`); commit or
  push only when the user says so. Create the GitHub repository only when the
  user asks.
- **Copy:** only client-confirmed facts; unknown ones stay as [PLACEHOLDERS].
  No full stops on headings.
- **Shared code:** when you change a part that also exists in londonlhd-v2
  (photo pipeline, /cars, car page, brand system, layout), say so, so the
  user can decide whether to carry it across.
- Decisions in `BRIEF.md` under "Decisions to make" are the user's. Ask
  before assuming one.
