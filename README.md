# Recipes

The Eat / Yeet recipe archive: twelve recipes as YAML fixtures, rendered by
**TanStack Start** into a fully prerendered static site and served from
Cloudflare Pages at [eatyeet.com](https://eatyeet.com).

No database, no API, no server at runtime. `npm run build` prerenders every
route to HTML at build time; Pages serves the files.

## Commands

```bash
npm run dev        # vite dev server
npm run build      # -> .output/public (prerendered HTML + hashed assets)
npm run serve      # preview the built site at 127.0.0.1:4321, as Pages serves it
npm test           # build, then static + interaction + guard self-tests
npm run storybook  # dev server; open /storybook for the component harness
npm run test:recipe-pages  # build, then recipe-page redesign coverage
npm run typecheck  # tsc --noEmit (also runs inside build)
npm run classes    # class guard alone (also runs inside build)
npm run parity     # build, then pixel-diff against a baseline
npm run shots      # Playwright screenshots -> dist/shots/
npm run content    # fixtures -> src/generated (runs as part of build)
npm run convert    # one-time import from the old yeet seed dump
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
| `/storybook` | internal noindex component harness; prerendered but not in sitemap |
| `/sitemap.xml`, `/robots.txt` | generated after the build |

`/search` is `Disallow`ed in robots.txt and absent from the sitemap. It is one
page whose filters are query params, and pointing a crawler at every facet
permutation only competes with the recipe pages those permutations link to.

There are no category pages. The original never had them — its browse cards
linked into `/search` with a facet applied, which is what `lib/categories.ts`
encodes.

## Visual system

The home, browse, search, card, nav, footer, and command-palette surfaces still
reuse the retired Eat / Yeet production CSS and component structure. Recipe
detail pages are the deliberate exception: they now use the Butternut-inspired
article/card layout in `components/recipe-butternut-trial.tsx`, promoted to all
canonical `/recipes/<slug>` routes through `components/recipe.tsx`.

`src/styles/global.css` is the **production Tailwind build** lifted from the old
site's `.output/public/assets/global-*.css`, and the components are transcribed
class-for-class from the original React ones. Matching class names against the
original compiled CSS is what keeps the unchanged surfaces stable. New recipe
page and chrome overrides live in `src/styles/site-overrides.css`; prefer data
attributes plus scoped CSS there over inventing Tailwind utilities that do not
exist in the compiled build.

| Component | Ported from |
|---|---|
| `components/layout.tsx` | `platform/L3/layout/{nav,footer}.tsx`, `components/{recipe-card,browse-card}.tsx` |
| `components/home.tsx` | `components/hero.tsx`, `containers/home-container.tsx` |
| `components/recipe.tsx` | canonical wrapper for the redesigned recipe article |
| `components/recipe-butternut-trial.tsx` | redesigned recipe article, cook mode, print/pin controls, desktop browse sidebar |
| `components/storybook-harness.tsx` | internal component harness rendered at `/storybook` |
| `components/search.tsx` | `containers/search-container.tsx`, `components/{filter-sidebar,faceted-filter-group,category-toggle}.tsx` |
| `components/palette.tsx` | `components/search-command-palette.tsx`, `packages/ui/.../dialog.tsx` |
| `lib/seo.ts` | `platform/L1/seo.ts` |
| the recipe JSON-LD | `features/recipes/components/recipe-json-ld.tsx` |

### Only classes the original site used exist

There is **no Tailwind compiler in this project**. `global.css` is a finished
build, so a utility the original site never used does not exist in it — and
using one fails silently. Nothing errors; the element is simply unstyled.

This has shipped twice. `lg:flex lg:gap-10` on the search results row left it a
plain block, so the filter sidebar stacked *above* the results on desktop
instead of beside them. `mt-14` on a browse section was dead from the day it was
written. Neither produced a warning.

`npm run classes` (and every `npm run build`) fails on any class the stylesheet
does not define. Before reaching for a utility, check it exists:

```bash
node scripts/has-class.mjs 'lg:flex' 'mt-12' 'w-[260px]'
#   MISSING  lg:flex
#   PRESENT  mt-12
#   PRESENT  w-[260px]
```

If a class is missing, the fix is to use one the original used — not to
hand-write CSS, which is how a design drifts. `test/check-classes.test.mjs`
covers the guard itself, because an earlier version of it passed clean while
`lg:flex` sat in a one-line constant: a guard that silently passes is worse
than none.

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

One departure from the original is deliberate:

- **No sign-in.** The original nav had a Sign in button; there is no auth here,
  so it is removed rather than rendered as a dead control.
- **Recipe detail layout.** Recipe pages use a print-focused article card with
  cook mode, local Geller/Avenir font assets, and a desktop-only "Browse
  Recipes" sidebar. The sidebar is hidden on mobile, in print, and in cook mode.

## Storybook harness

`/storybook` is a static, noindex harness for reviewing production components
with production data. It is intentionally lightweight rather than the external
Storybook package: the app is already a prerendered Vite/TanStack site, and the
repo's testing/visual workflow runs through Playwright against the same built
HTML Cloudflare Pages serves.

The harness currently covers:

- section heading typography
- recipe cards
- browse gallery cards
- empty and filled recipe grids
- the canonical redesigned recipe article

Use it locally with:

```bash
npm run storybook
# open http://127.0.0.1:5173/storybook if the browser does not open itself
```

The route is listed in `site.config.mjs` under `TRIAL_PATHS`, so it is
prerendered and testable, but `scripts/build-seo.mjs` keeps it out of the
sitemap and disallows it in `robots.txt`.

## How it works

`scripts/build-content.mjs` parses the YAML fixtures into `src/generated`,
split two ways on purpose:

- `index.json` — every recipe minus its body. Cards, facets, and the search
  palette run off this, and it ships once.
- `recipes/<slug>.json` — one body per recipe, loaded through `import.meta.glob`
  so Vite emits a chunk per recipe. Reading one recipe never pulls the other
  eleven.

Every route is then prerendered by `scripts/prerender.mjs`, using the explicit
path list in `site.config.mjs`. TanStack Start's built-in prerender path starts
a Vite/Nitro preview server and waits on Nitro's random-port probe; that probe
can fail in restricted loopback environments even when the generated server is
healthy. The local script keeps the route list obvious, binds the server to
`127.0.0.1`, and writes the same plain HTML files into `.output/public`.

Do not enable link crawling for prerendering. Crawling follows browse links into
`/search?...` and creates one page per facet permutation. `/search` is an
interactive page, not an SEO surface.

```
fixtures/recipes/*.yaml content
src/generated/          built from fixtures; not checked in
src/lib/categories.ts   browse categories (first 8 mirror the original home grid)
src/lib/model.ts        facets, filtering, search
src/lib/format.ts       times, yields, labels
src/lib/seo.ts          head metadata
src/components/         icons, layout, home, recipe, storybook, search, palette
src/routes/             file-based routes
src/styles/global.css   the original production Tailwind build
site.config.mjs         the canonical origin and the prerender path list
```

### Adjacent JSX expressions split text nodes

`{count} {noun}` renders as three text nodes, and the browser shapes each run
separately — which moved glyphs by a subpixel and showed up as a real pixel
diff. Interpolate once (`` {`${count} ${noun}`} ``) anywhere the result sits in
one visual run.

### Rendered recipe HTML is generated data

Recipe body strings in YAML are rendered from inline Markdown to a small
allowlist of inline HTML at content build time. Raw HTML and unsafe link
protocols are escaped before they reach `src/generated`, because recipe pages
intentionally inject those strings with `dangerouslySetInnerHTML` to preserve
inline links. JSON-LD must also escape `<` after `JSON.stringify()` so recipe
text can never break out of the script tag.

Search and JSON-LD convert that rendered HTML back to plain text with
`stripTags()`, which also decodes common HTML entities. Keep that in sync with
`scripts/parse.mjs`; otherwise page rendering may look right while search and
schema text drift.

## Deploying

Cloudflare Pages, project `eatyeet`, which also serves the domain's DNS.
This section is the only deployment runbook — there is no second copy to drift.

### Verify, then ship

```bash
npm test     # build + static + interaction + recipe-page + guard self-tests
npm run serve   # preview the exact bytes Pages will serve, at :4321
doppler run -p yeet -c dev -- \
  npx wrangler pages deploy .output/public --project-name eatyeet
```

`npm test` runs `npm run build` first, so a passing test run means the artifact
in `.output/public` is the one that was tested. Deploy that directory; never a
directory built by some other command.

In Codex or any other non-interactive shell, run Wrangler through Doppler as
shown above. A plain `npx wrangler ...` fails without
`CLOUDFLARE_API_TOKEN`, because Wrangler cannot open an interactive login flow
there. The successful deploy shape is:

```bash
doppler run -p yeet -c dev -- npx wrangler pages deploy .output/public --project-name eatyeet
```

### What the build does

`npm run build` runs five steps, in order, and any one of them failing stops it:

| Step | Why it can fail the build |
|---|---|
| `scripts/build-content.mjs` | fixtures → `src/generated` (index + per-recipe chunks) |
| `scripts/check-classes.mjs` | a class not in the compiled stylesheet — see below |
| `tsc --noEmit` | type errors |
| `vite build` | bundling |
| `scripts/prerender.mjs` | renders every path in `site.config.mjs` to HTML |
| `scripts/build-seo.mjs` | writes `sitemap.xml`, `robots.txt`, `_headers` |

Routes and the canonical origin live in **`site.config.mjs`** only. Adding a
route means editing that file; the prerenderer, the sitemap, and the app all
read it.

### Credentials

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live in Doppler, project
`yeet`, config `dev`. The token holds **Pages: Edit**, **Zone: DNS: Edit**, and
**Zone: Zone: Read**, scoped to `eatyeet.com`.

It deliberately does **not** hold **Cache Purge**, and that has already cost a
debugging session — see the cache note below. Add that permission if you want
purges to be scriptable.

### Cache headers, and a trap worth knowing

`scripts/build-seo.mjs` writes `_headers`: `/build/*` is fingerprinted by Vite
so it is `immutable` for a year; `/images/*` and `/fonts/*` keep plain names and
get a day plus revalidation; HTML is left to Pages' own revalidation.

**Pages applies every matching rule and merges the results.** A `Cache-Control`
under `/*` does not act as a default — it combines with `/build/*` and produced
`max-age=14400, immutable, must-revalidate`. That merge had teeth: during one
deploy a chunk briefly 404'd, Pages answered with HTML, and the bogus header let
the edge cache that HTML *under the chunk's URL*. Browsers then got `text/html`
for a module script and the page stopped hydrating, while `curl` hit a different
cached variant and looked fine. Keep `/*` to security headers only.

The hashed asset directory is `/build`, not Vite's default `/assets`, because
retiring the poisoned path was the only way to recover without a purge token.

### DNS

Cloudflare creates the apex and `www` records when the Pages custom domain is
attached. Do not hand-copy registrar parking `A`/`AAAA` records into Cloudflare
— those point at the registrar's placeholder page, not at this project.

### Rolling back

Every deploy gets its own immutable `*.pages.dev` URL. To roll back, promote a
previous deployment in the Pages dashboard, or rebuild from the previous commit
and deploy again. Assets are content-hashed, so an older deploy references its
own asset URLs and does not depend on the current ones.

## Adding a recipe

Drop a YAML document in `fixtures/recipes/`. Scalars and taxonomy live at the
top level. `equipment`, `ingredients`, and `steps` are arrays of titled
sections; `notes` and `tips` are flat arrays. Every displayed string inside
those body fields may contain inline Markdown links/emphasis, rendered by
`scripts/parse.mjs` during `npm run content`.

```yaml
slug: my-recipe
title: My Recipe
description: One line.
category: savory
courses:
  - mains
cuisines:
  - italian
methods:
  - stovetop
restrictions: []
occasions:
  - everyday
ingredientTypes: []
prepMinutes: 20
cookMinutes: 40
totalMinutes: 60
yieldAmount: 4
yieldUnit: serving
image: my-recipe.jpg
created: 2026-08-15
equipment: []
ingredients:
  - title: Sauce
    items:
      - 2 tbsp [olive oil](https://example.com/oil)
steps:
  - title: ''
    items:
      - Do the thing.
notes:
  - Something worth knowing.
tips:
  - Something worth doing.
```

Recipes sort newest-first by `created`. Categories appear once a recipe carries
the matching facet value. Recipe `title` and `description` are canonical plain
text because cards, SEO, JSON-LD, and search all consume them directly.

## Provenance

Content was imported from the retired `yeet` platform's `seeds/fixtures.sql`
(12 published recipes) via `scripts/convert-fixtures.mjs`. Structured ingredient
columns were dropped in favour of each item's rendered description, which
already carries quantities, brands, and inline links. Ratings, revisions,
collections, and users were dropped as database-only concepts — which is also
why the home page uses the original's no-ratings branch: a single "Latest
Recipes" section above the browse grid.

### Image provenance

Four recipe photos survived in `frontend/apps/web/public/images/`. The rest have
mixed origins and should be treated as replacements unless noted otherwise:

- **bolognese** — was restored from git history, but has since been replaced
  with the owner-supplied Unsplash photo
  `sorin-popa-XAxvKp0tdwU-unsplash.jpg`. The recovered original is still in git
  history at the commit before it was swapped.
- **sourdough** — was also recovered from git history, but has since been
  **replaced by a generated image** the owner supplied. It is not a photograph
  of this loaf. The recovered original is still in git history at the commit
  before it was swapped.
- **raised donuts** — carved out of a leftover Next.js image cache
  at `apps/eat-yeet/.next/cache/images/`. That cache stores no filenames, so
  the match was made **by eye**.

- **banana bread** — no image survived; the owner supplied one directly, so it
  is not from the old platform.

- **donut glaze** — no original image survived; replaced with the
  owner-supplied Unsplash photo
  `melanie-boers-urrWQ8bYwcw-unsplash.jpg`.

- **classic baked mac and cheese** — no original image survived; replaced with
  the owner-supplied Unsplash photo
  `alexandra-tran-aeLcUBr7kmM-unsplash.jpg`.

All twelve recipes now have images.
Searched and came up empty: the working tree, the Next.js image cache, all 53
image files in git history across every branch, Chrome's HTTP and image caches
(which hold only the 160x160 mascot icon), and `~/Downloads`, `~/Desktop`,
`~/Pictures`, `~/Documents`. The originals were S3 objects
(`seed/vanilla-cupcakes-hero.webp` and friends) in the deleted
`yeet-production-images` bucket, and both domains' Route53 zones are gone, so
there is nothing left to fetch. To replace one, drop the file in
`public/images/` and point the recipe YAML `image` field at it.
