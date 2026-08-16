# Recipes

A recipe archive built from markdown fixtures, into either **one self-contained
HTML file** or **a static site**.

No database, no API, no build framework. Two build targets share one renderer:

| | `npm run build` | `npm run build:web` |
|---|---|---|
| Output | `dist/recipes.html` | `dist/index.html` + `dist/assets/` |
| Assets | inlined as data URIs | separate, content-hashed files |
| Size | ~6.8 MB, always | 37 KB entry, 2.3 MB first load, ~0 after |
| For | iCloud Drive, opened by double-clicking | Cloudflare Pages |

The single file exists because `file://` cannot fetch anything, so everything
has to already be in the document. That same encoding is wrong over HTTP, where
it would cost every visitor the whole payload on every visit and cache nothing
separately. Both targets render identical markup — the screenshots come out
byte-for-byte identical — and differ only in how assets are referenced.

## Commands

```bash
npm run dev        # dev server on :4321, re-reads fixtures on every request
npm run build      # -> dist/recipes.html          (the iCloud deliverable)
npm run build:web  # -> dist/index.html + assets   (the deployed site)
npm test           # both targets: 37 + 38 static, 17 browser checks each
npm run test:file  # single-file target only
npm run test:web   # web target only, driven over real HTTP
npm run shots      # Playwright screenshots -> dist/shots/file/
npm run shots:web  # ... and -> dist/shots/web/
npm run convert    # one-time import from the old yeet seed dump
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

`render()` takes an optional **target** that decides only how the document
reaches its assets — a map of public path to URL, plus how the stylesheet and
scripts are referenced. The default inlines everything; `build-web.js` passes
one that points at hashed files and collects the writes those URLs imply.
Markup, shell, and bundle are produced by the same code either way, so the two
targets cannot drift.

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
src/render.js           recipes -> HTML, given a target
src/assets.js           asset resolution for both targets
src/build.js            the single-file target
src/build-web.js        the web target
```

### Bundling caveat

Concatenation puts every top-level binding in one scope, so a name declared in
two files silently resolves to whichever came last. That shipped a real bug once
— `renderHero` existed in both `home.js` and `recipe.js`, and the recipe version
won on the home page, blanking the hero. `render.js` now fails the build on
duplicate top-level names.

## Constraints worth knowing

The single file is opened over `file://`, which is stricter than it looks:

- **No ES modules.** `type="module"` is blocked by CORS on the file origin.
- **No `fetch()`.** Recipe data is inlined as a JS literal, never loaded.
- **No clean URLs.** Directory indexes don't resolve, so routing is hash-based
  (`#/r/charred-crust-pizza`).
- **No external assets.** Fonts and images are base64 data URIs.

These bind the single-file target only, and `npm run test:file` asserts every
one of them. `test:web` **skips** those eight assertions rather than deleting
them — the web target exists precisely to violate the last two — and asserts its
own inverse in their place: no data URIs survive, every reference resolves to a
file on disk, every asset name carries a content hash, and the first load stays
under budget. Keep the hash-routing constraint in both: it is why the site needs
no SPA fallback and why `/` is the only URL a server ever sees.

Both targets are then driven in headless Chromium — the single file over
`file://`, the web build over real HTTP from a throwaway static server — through
the same 17 interaction checks: opening the palette, typing, navigating with the
keyboard, toggling filters. Static assertions cannot catch a control wired to
nothing; that is what these are for, and the facet chips have silently died this
way before.

## Deploying

The site is served by **Cloudflare Pages** at `eatyeet.com`, which also hosts the
domain's DNS. Project settings:

| Setting | Value |
|---|---|
| Build command | `npm ci --omit=dev && npm run build:web` |
| Output directory | `dist` |
| Node version | `.nvmrc` (22) |

`--omit=dev` skips Playwright, which is a ~100 MB browser download the build
does not need — only `gray-matter` and `marked` are used at build time.

`dist/_headers` is generated by the build and tells Pages to serve `/assets/*`
`immutable` for a year, and `/` with `must-revalidate`. That split is safe only
because asset filenames carry a content hash, so changed bytes always mean a
changed URL. If you ever emit an unhashed asset, fix the header rule too — a
stale year-long cache is not something a redeploy can clear.

No `_redirects` and no SPA fallback: routing is hash-based, so `/` is the only
path ever requested.

To deploy, push to `main`. To preview the exact bytes Pages will serve:

```bash
npm run build:web
npx serve dist          # or any static server
```

The single-file build is unaffected by any of this and is still shipped by hand:

```bash
npm run build
cp dist/recipes.html ~/Library/Mobile\ Documents/com~apple~CloudDocs/Recipes/
```

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
