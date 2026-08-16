# Recipes

The Eat / Yeet recipe archive: twelve recipes as markdown fixtures, rendered by
**TanStack Start** into a fully prerendered static site and served from
Cloudflare Pages at [eatyeet.com](https://eatyeet.com).

No database, no API, no server at runtime. `npm run build` prerenders every
route to HTML at build time; Pages serves the files.

## Commands

```bash
npm run dev      # vite dev server
npm run build    # -> .output/public (prerendered HTML + hashed assets)
npm run preview  # serve the build locally on 127.0.0.1
npm test         # build, then static and browser interaction checks
npm run parity   # build, then pixel-diff against a baseline
npm run shots    # Playwright screenshots -> dist/shots/
npm run content  # fixtures -> src/generated (runs as part of build)
npm run convert  # one-time import from the old yeet seed dump
```

## URLs

The shape matches the original site exactly, so old inbound links still resolve.

| Route | |
|---|---|
| `/` | home — hero, latest six, browse grid |
| `/recipes` | full listing |
| `/recipes/<slug>` | recipe detail ×12 — the pages that carry the SEO weight |
| `/browse` | browse by course, cuisine, method, diet |
| `/search` | interactive; filters live in query params |
| `/sitemap.xml`, `/robots.txt` | generated after the build |

`/search` is `Disallow`ed in robots.txt and absent from the sitemap. It is one
page whose filters are query params, and pointing a crawler at every facet
permutation only competes with the recipe pages those permutations link to.

There are no category pages. The original never had them — its browse cards
linked into `/search` with a facet applied, which is what `lib/categories.ts`
encodes.

## Visual parity with the original site

This is not a reinterpretation of the Eat / Yeet design — it reuses it directly.

`src/styles/global.css` is the **production Tailwind build** lifted from the old
site's `.output/public/assets/global-*.css`, and the components are transcribed
class-for-class from the original React ones. Matching class names against the
original compiled CSS is what makes the rendering identical rather than merely
similar. Each component names its source at the top.

| Component | Ported from |
|---|---|
| `components/layout.tsx` | `platform/L3/layout/{nav,footer}.tsx`, `components/{recipe-card,browse-card}.tsx` |
| `components/home.tsx` | `components/hero.tsx`, `containers/home-container.tsx` |
| `components/recipe.tsx` | `containers/recipe-detail-container.tsx` and its section components |
| `components/search.tsx` | `containers/search-container.tsx`, `components/{filter-sidebar,faceted-filter-group,category-toggle}.tsx` |
| `components/palette.tsx` | `components/search-command-palette.tsx`, `packages/ui/.../dialog.tsx` |
| `lib/seo.ts` | `platform/L1/seo.ts` |
| the recipe JSON-LD | `features/recipes/components/recipe-json-ld.tsx` |

`format.ts`'s `humanizeMinutes` and `formatYield` are exact ports of the
original `formatTime` / `formatYield`; keep them byte-compatible or card and
header text will drift. `formatTime` keeps minutes alongside days
("4 days 4 hr 37 min") and `formatYield` does **not** pluralize
("2 16-inch pizza").

`npm run parity` diffs screenshots against a baseline and fails on any real
change. The rewrite from the previous string-template renderer landed at **zero
differing pixels across all five views**. To regenerate a baseline from that
engine:

```bash
git worktree add /tmp/oldengine 3e8082a
cd /tmp/oldengine && npm install && npm run build:web && node test/shots.mjs --web
# baseline lands in dist/shots/web
```

Two departures from the original, both deliberate:

- **Four of twelve recipes have no photo** — american-buttercream,
  vanilla-cupcakes, chocolate-chip-banana-bread, classic-baked-mac-and-cheese.
  Their images died with the S3 bucket, so those cards render the original's
  `UtensilsCrossed` fallback, which is what the real site showed for an
  imageless recipe. They also emit no JSON-LD `image` and so will not qualify
  for a rich result — the honest outcome rather than a substituted photo.
- **No sign-in.** The original nav had a Sign in button; there is no auth here,
  so it is removed rather than rendered as a dead control.

## How it works

`scripts/build-content.mjs` parses the markdown fixtures into `src/generated`,
split two ways on purpose:

- `index.json` — every recipe minus its body. Cards, facets, and the search
  palette run off this, and it ships once.
- `recipes/<slug>.json` — one body per recipe, loaded through `import.meta.glob`
  so Vite emits a chunk per recipe. Reading one recipe never pulls the other
  eleven.

Every route is then prerendered by `scripts/prerender.mjs`, using the explicit
path list in `src/lib/paths.ts`. TanStack Start's built-in prerender path starts
a Vite/Nitro preview server and waits on Nitro's random-port probe; that probe
can fail in restricted loopback environments even when the generated server is
healthy. The local script keeps the route list obvious, binds the server to
`127.0.0.1`, and writes the same plain HTML files into `.output/public`.

Do not enable link crawling for prerendering. Crawling follows browse links into
`/search?...` and creates one page per facet permutation. `/search` is an
interactive page, not an SEO surface.

```
fixtures/recipes/*.md   content
src/generated/          built from fixtures; not checked in
src/lib/categories.ts   browse categories (first 8 mirror the original home grid)
src/lib/model.ts        facets, filtering, search
src/lib/format.ts       times, yields, labels
src/lib/seo.ts          head metadata
src/lib/paths.ts        the prerender list and canonical origin
src/components/         icons, layout, home, recipe, search, palette
src/routes/             file-based routes
src/styles/global.css   the original production Tailwind build
```

### Adjacent JSX expressions split text nodes

`{count} {noun}` renders as three text nodes, and the browser shapes each run
separately — which moved glyphs by a subpixel and showed up as a real pixel
diff. Interpolate once (`` {`${count} ${noun}`} ``) anywhere the result sits in
one visual run.

### Rendered recipe HTML is generated data

Markdown list items are rendered to a small allowlist of inline HTML at content
build time. Raw HTML and unsafe link protocols are escaped before they reach
`src/generated`, because recipe pages intentionally inject those strings with
`dangerouslySetInnerHTML` to preserve inline links. JSON-LD must also escape
`<` after `JSON.stringify()` so recipe text can never break out of the script
tag.

Search and JSON-LD convert that rendered HTML back to plain text with
`stripTags()`, which also decodes common HTML entities. Keep that in sync with
`scripts/parse.mjs`; otherwise page rendering may look right while search and
schema text drift.

## Deploying

Cloudflare Pages, project `eatyeet`, which also hosts the domain's DNS.

```bash
npm run build
doppler run -p yeet -c dev -- npx wrangler pages deploy .output/public --project-name eatyeet
```

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live in Doppler, project
`yeet`, config `dev`.

`scripts/build-seo.mjs` writes `_headers` into the output: `/build/*` is
fingerprinted by Vite so it is served `immutable` for a year, images and fonts
keep plain names and get a day plus revalidation, and HTML is left to
Cloudflare Pages' default revalidation behavior.

Cloudflare Pages applies every matching `_headers` rule and merges headers.
Do not put a catch-all `Cache-Control` under `/*`; it can combine with
`/build/*`, poison an asset URL as immutable HTML, and require either a cache
purge token or a fresh asset path to recover. The hashed asset directory is
`/build` rather than `/assets` because an earlier bad edge-cache entry under
the old path outlived its deploy.

Cloudflare creates the apex/www DNS records when the Pages custom domain is
attached. Do not copy registrar parking A/AAAA records into Cloudflare; those
point at the registrar's placeholder site, not this Pages project. The old
single-file/iCloud build target was intentionally dropped after Pages went live.

## Adding a recipe

Drop a markdown file in `fixtures/recipes/`. Frontmatter carries the scalars and
taxonomy; the body uses `##` for the block and `###` for named sections:

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
image: my-recipe.jpg      # optional; file goes in public/images/
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

Recipes sort newest-first by `created`. Categories appear once a recipe carries
the matching facet value.

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
there is nothing left to fetch. To restore one, drop the file in
`public/images/` and add an `image:` line to its frontmatter.
