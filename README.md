# Recipes

A recipe archive built from markdown fixtures into **one self-contained HTML file**.

No database, no API, no build framework. `npm run build` produces
`dist/recipes.html` — a single ~6.8 MB file with the stylesheet, fonts, images,
recipe data, and client code all inlined. Drop it in iCloud Drive and open it by
double-clicking, on a Mac or an iPhone.

## Commands

```bash
npm run dev      # dev server on :4321, re-reads fixtures on every request
npm run build    # -> dist/recipes.html
npm test         # builds, then runs 37 static + 17 browser interaction checks
npm run shots    # Playwright screenshots of the built file -> dist/shots/
npm run convert  # one-time import from the old yeet seed dump
```

## Visual parity with the original site

This is not a reinterpretation of the Eat / Yeet design — it reuses it directly.

`assets/css/global.css` is the **production Tailwind build** lifted from the old
site's `.output/public/assets/global-*.css`, and the templates are transcribed
class-for-class from the original React components. Matching class names against
the original compiled CSS is what makes the rendering identical rather than
merely similar. Each template names its source component at the top:

| Template | Ported from |
|---|---|
| `templates/layout.js` | `platform/L3/layout/{nav,footer}.tsx`, `components/{recipe-card,browse-card}.tsx` |
| `templates/home.js` | `components/hero.tsx`, `containers/home-container.tsx` |
| `templates/recipe.js` | `containers/recipe-detail-container.tsx` and its section components |
| `templates/search.js` | `containers/search-container.tsx`, `components/{filter-sidebar,faceted-filter-group,category-toggle}.tsx` |
| `templates/palette.js` | `components/search-command-palette.tsx`, `packages/ui/.../dialog.tsx` |

`format.js`'s `humanizeMinutes` and `formatYield` are exact ports of the
original `formatTime` / `formatYield`; keep them byte-compatible or card and
header text will drift.

The search page's `FilterSidebar`, its Radix checkboxes, the category pill
toggle, and the global search palette (`search-command-palette.tsx`) are all
ported markup too — the palette opens from the nav search button or Cmd/Ctrl-K
and filters the inlined recipe array instead of calling Typesense.

Two departures:

- **Four of twelve recipes have no photo** — american-buttercream,
  vanilla-cupcakes, chocolate-chip-banana-bread, classic-baked-mac-and-cheese.
  Their images died with the S3 bucket, so those cards render the original's
  `UtensilsCrossed` fallback, which is what the real site showed for an
  imageless recipe. The other eight were recovered (see Provenance).
- **No sign-in.** The original nav had a Sign in button; there is no auth in an
  offline archive, so it is removed rather than rendered as a dead control.

## How it works

The whole thing is one function: `render(recipes)` returns a complete HTML
document. `serve.js` calls it per request; `build.js` calls it once and writes
to disk. There is no separate dev and prod path.

Templates are plain string functions with no DOM access, so the same code runs
in Node at build time and in the browser on hash navigation. `render.js`
concatenates the shared modules into one classic script — `file://` refuses to
load `type="module"`, so a module graph isn't an option in the output.

```
fixtures/recipes/*.md   content
fixtures/categories.js  browse categories (first 8 mirror the original home grid)
assets/css/global.css   the original production Tailwind build
assets/{fonts,img}/     inlined as data URIs at build time
src/parse.js            markdown -> recipe objects (Node only)
src/model.js            facets, filtering, search
src/format.js           times, yields, labels
src/icons.js            lucide SVGs, transcribed from the production bundle
src/routes.js           hash routing vocabulary
src/templates/          layout, home, search, category, recipe, palette
src/page.js             route -> page HTML, nav state, document shell
src/router.js           browser runtime
src/render.js           recipes -> the single file
```

### Bundling caveat

Concatenation puts every top-level binding in one scope, so a name declared in
two files silently resolves to whichever came last. That shipped a real bug once
— `renderHero` existed in both `home.js` and `recipe.js`, and the recipe version
won on the home page, blanking the hero. `render.js` now fails the build on
duplicate top-level names.

## Constraints worth knowing

The output is opened over `file://`, which is stricter than it looks:

- **No ES modules.** `type="module"` is blocked by CORS on the file origin.
- **No `fetch()`.** Recipe data is inlined as a JS literal, never loaded.
- **No clean URLs.** Directory indexes don't resolve, so routing is hash-based
  (`#/r/charred-crust-pizza`).
- **No external assets.** Fonts and images are base64 data URIs.

`npm test` asserts all of these against the built file, then drives the real
page in headless Chromium over `file://` — opening the palette, typing,
navigating with the keyboard, and toggling filters. If you add a feature that
reaches for the network, or wire a control to nothing, the tests will catch it.

## Adding a recipe

Drop a markdown file in `fixtures/recipes/`. Frontmatter carries the scalars
and taxonomy; the body uses `##` for the block and `###` for named sections:

```markdown
---
slug: my-recipe
title: My Recipe
description: One line.
category: savory          # savory | sweet
courses: [mains]
cuisines: [italian]
methods: [stovetop]
restrictions: []
occasions: [everyday]
prepMinutes: 20
cookMinutes: 40
totalMinutes: 60
yieldAmount: 4
yieldUnit: serving
image: my-recipe.jpg      # optional; file goes in assets/img/
created: 2026-08-15
---

## Ingredients

### Sauce
- 2 tbsp olive oil

## Steps

1. Do the thing.

## Notes
- Something worth knowing.

## Tips
- Something worth doing.
```

Categories appear once a recipe carries the matching facet value; empty ones are
hidden, except the eight featured on the home grid.

## Provenance

Content was imported from the retired `yeet` platform's `seeds/fixtures.sql`
(12 published recipes) via `scripts/convert-fixtures.mjs`. Structured ingredient
columns were dropped in favour of each item's rendered description, which
already carries quantities, brands, and inline links. Ratings, revisions,
collections, and users were dropped as database-only concepts — which is also
why the home page uses the original's no-ratings branch: a single "Latest
Recipes" section above the browse grid.

### Image recovery

Four recipe photos survived in `frontend/apps/web/public/images/`. Four more
were recovered:

- **sourdough, bolognese** — restored from git history
  (`apps/eat-yeet/public/images/{sourdough-crumb,bolognese}.jpg`), so the
  filenames confirm the assignment.
- **raised donuts, donut glaze** — carved out of a leftover Next.js image cache
  at `apps/eat-yeet/.next/cache/images/`. That cache stores no filenames, so
  these two were matched **by eye**; either could belong to the other recipe.
  Swap the `image:` lines in their frontmatter if they look wrong.

Four recipes have no surviving image anywhere: american-buttercream,
vanilla-cupcakes, chocolate-chip-banana-bread, classic-baked-mac-and-cheese.
Searched and came up empty: the working tree, the Next.js image cache, all 53
image files in git history across every branch, Chrome's HTTP and image caches
(which hold only the 160x160 mascot icon), and `~/Downloads`, `~/Desktop`,
`~/Pictures`, `~/Documents`. The originals were S3 objects
(`seed/vanilla-cupcakes-hero.webp` and friends) in the deleted
`yeet-production-images` bucket, and both domains' Route53 zones are gone, so
there is nothing left to fetch. To restore one, drop the file in `assets/img/`
and add an `image:` line to its frontmatter.
