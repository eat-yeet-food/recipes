# Agent guide

The Eat / Yeet recipe archive: 12 markdown fixtures rendered by TanStack Start
into a fully prerendered static site on Cloudflare Pages at eatyeet.com.
No database, no API, **no server at runtime**.

Read `README.md` for the full picture. This file is the short list of things
that have already gone wrong here.

## 1. Only classes the original site used exist

`src/styles/global.css` is the original site's **compiled production Tailwind
build**. There is no Tailwind compiler in this project. A utility the original
never used does not exist in that file, and using one **fails silently** —
no error, no warning, just an unstyled element.

```bash
node scripts/has-class.mjs 'lg:flex' 'mt-12'   # check before you use one
npm run classes                                 # guard; also runs in build
```

This has shipped twice. `lg:flex lg:gap-10` left the search results row a plain
block, so the filter sidebar stacked *above* the results on desktop instead of
beside them. `mt-14` on a browse section was dead the day it was written.

When a class is missing, **use one the original used**. Do not hand-write CSS
and do not add a Tailwind build — either one drifts the design.

## 2. The original components are the source of truth

`/Users/phoganuci/src/yeet/frontend/apps/web/src/` holds the React components
this was transcribed from. **Read them before changing markup or classes.**
Every component here names its source at the top.

`~/src/yeet` is **read-only**. Never modify anything under it.

`format.ts`'s `humanizeMinutes` and `formatYield` are exact ports. `formatTime`
keeps minutes alongside days ("4 days 4 hr 37 min"); `formatYield` does **not**
pluralize ("2 16-inch pizza"). Changing either drifts card and header text.

## 3. Verify visually, not just by assertion

A control can render perfectly and be wired to nothing — a screenshot cannot
tell. A pixel diff cannot tell you a link points at the wrong page.

```bash
npm test          # build + static + interaction + guard self-tests
npm run parity    # pixel-diff against a baseline
npm run serve     # look at it: 127.0.0.1:4321, served as Pages serves it
```

Take screenshots and **actually look at them** when changing layout.

## 4. Query strings do not select files

Pages serves `/search/index.html` for `/search?courses=mains` — one prerendered
document for every query string. So the search page must render its *unfiltered*
state on the first client pass and apply params in an effect; rendering filtered
results immediately is a hydration mismatch that throws away the server HTML.
See the note in `src/routes/search.tsx`.

Interactions reached by clicking never reproduce this. Test cold navigations.

## 5. Routes and origin live in one place

`site.config.mjs` — the canonical origin and the prerender path list. The app,
the prerenderer, and the sitemap all read it. They used to hold three copies
and drifted.

## 6. `_headers` rules merge

Cloudflare Pages applies *every* matching rule. A `Cache-Control` under `/*`
does not act as a default; it combines with `/build/*`. That merge once let the
edge cache an HTML 404 body under a JS chunk's URL as `immutable`, and the site
stopped hydrating. Keep `/*` to security headers only.

## 7. Don't fabricate content

Two of twelve recipes have no photo. They render the original's
`UtensilsCrossed` fallback and emit no JSON-LD `image`, so they will not earn a
rich result. That is the honest outcome — do not substitute a stock photo to
make a page look finished. State gaps plainly.

`README.md`'s "Image provenance" section records where every image came from,
including the ones that are not photographs of these dishes. Keep it accurate.
