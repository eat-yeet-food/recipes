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
npm run storybook  # Storybook dev server at 127.0.0.1:6006
npm run build-storybook  # static Storybook build -> storybook-static/
npm run test:recipe-pages  # build, then recipe-page redesign coverage
npm run typecheck  # generate content/routes, then tsc --noEmit
npm run classes    # class guard alone (also runs inside build)
npm run parity     # build, then pixel-diff against a baseline
npm run shots      # Playwright screenshots -> dist/shots/
npm run deploy     # deploy + purge + verify the live site (run via Doppler)
npm run verify:prod [origin]  # cold-load the deployed site in Chrome
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
| `components/search.tsx` | `containers/search-container.tsx`, `components/{filter-sidebar,faceted-filter-group,category-toggle}.tsx` |
| `components/palette.tsx` | `components/search-command-palette.tsx`, `packages/ui/.../dialog.tsx` |
| `stories/design-system.stories.tsx` | real Storybook CSF stories for design-system and component review |
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

## Storybook

This repo uses real Storybook with the React/Vite framework. Stories live in
`src/stories/*.stories.tsx`, Storybook config lives in `.storybook/`, and the
static build writes to `storybook-static/` (ignored by git).

The Storybook suite currently covers:

- design-system typography scale
- color tokens
- button and recipe link treatments
- form controls and filter chip states
- section heading typography
- recipe cards
- browse gallery cards
- empty and filled recipe grids
- the canonical redesigned recipe article
- not-found and error-boundary states (`DeadEnds`)

Use it locally with:

```bash
npm run storybook
# open http://127.0.0.1:6006
npm run build-storybook
```

Storybook imports production CSS plus `src/styles/storybook.css` for story-only
layout chrome. Components that use TanStack Router links are isolated with
`src/storybook/router-mock.tsx` through `.storybook/main.ts`; do not add a
production `/storybook` route.

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

It also writes `404.html`, and **fails the build** if an unmatched path does not
answer 404. Pages serves that file for anything it cannot match, which is what
keeps a missing asset from coming back as HTML under a 200. See the cache trap
under Deploying.

Do not enable link crawling for prerendering. Crawling follows browse links into
`/search?...` and creates one page per facet permutation. `/search` is an
interactive page, not an SEO surface.

### Dead ends look like one thing

`src/components/error-states.tsx` owns every way a visitor can hit a wall: a URL
that matches nothing, a route that threw, and a chunk that would not load. They
share a frame, so which subsystem failed is not the visitor's problem. Wired
through `router.tsx` (`defaultErrorComponent`, `defaultNotFoundComponent`) and
`__root.tsx`, prerendered into `404.html`, and reviewable as the `DeadEnds`
Storybook story.

The stale-build case is special. A failed dynamic import means this browser is
holding a build that no longer exists, so it offers a reload — the actual fix —
rather than a retry, which would re-run the same broken module graph and fail
the same way.

```
fixtures/recipes/*.yaml content
src/generated/          built from fixtures; not checked in
src/lib/categories.ts   browse categories (first 8 mirror the original home grid)
src/lib/model.ts        facets, filtering, search
src/lib/format.ts       times, yields, labels
src/lib/seo.ts          head metadata
src/components/         icons, layout, home, recipe, search, palette
src/components/error-states.tsx  not-found and error boundaries (see below)
src/stories/            Storybook stories for design-system and component review
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
npm test        # build + static + interaction + recipe-page + guard self-tests
npm run serve   # preview the exact bytes Pages will serve, at :4321
doppler run -p yeet -c dev -- npm run deploy
```

`npm test` runs `npm run build` first, so a passing test run means the artifact
in `.output/public` is the one that was tested. Deploy that directory; never a
directory built by some other command.

`npm run deploy` is three steps that belong together, and running only the first
is how the cache trap below happened:

| Step | Why it is in the command |
|---|---|
| `wrangler pages deploy` | ships `.output/public` |
| wait, then purge the zone | propagation is not atomic; this clears anything the wait itself cached during the window |
| `node test/verify-prod.mjs` | cold-loads the live domain in Chrome and fails on console errors, non-200s, assets served as HTML, and a dead router |

Do not hand-run the wrangler line instead. If you only want the last step,
`npm run verify:prod [origin]` runs it alone — point it at a `*.pages.dev` URL
to judge the artifact, or at eatyeet.com to judge what visitors get. Those two
can disagree, and only the second one is the site.

In Codex or any other non-interactive shell, run through Doppler as shown above.
A plain `npm run deploy` fails without `CLOUDFLARE_API_TOKEN`, because Wrangler
cannot open an interactive login flow there.

### What the build does

`npm run build` runs five steps, in order, and any one of them failing stops it:

| Step | Why it can fail the build |
|---|---|
| `scripts/build-content.mjs` | fixtures → `src/generated` (index + per-recipe chunks) |
| `scripts/check-classes.mjs` | a class not in the compiled stylesheet — see below |
| `vite build` | bundling |
| `tsc --noEmit` | type errors |
| `scripts/prerender.mjs` | renders every path in `site.config.mjs` to HTML, plus `404.html`; fails if an unmatched path does not return 404 |
| `scripts/build-seo.mjs` | writes `sitemap.xml`, `robots.txt`, `_headers` |

Routes and the canonical origin live in **`site.config.mjs`** only. Adding a
route means editing that file; the prerenderer, the sitemap, and the app all
read it.

### Credentials

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live in Doppler, project
`yeet`, config `dev`. The token holds **Pages: Edit**, **Zone: DNS: Edit**,
**Zone: Zone: Read**, and **Zone: Cache Purge**, scoped to `eatyeet.com`.

Cache Purge was added after the second occurrence of the trap below; `npm run
deploy` needs it, and without it a poisoned edge can only be cleared from the
dashboard.

### Cache headers, and a trap worth knowing

`scripts/build-seo.mjs` writes `_headers`:

| Path | Cache-Control | Why |
|---|---|---|
| `/*` | *(none)* | security headers only — a Cache-Control here merges onto every other rule |
| `/build/*` | `max-age=31536000` | fingerprinted by Vite, so the URL changes with the content. Deliberately **not** `immutable` — see below |
| `/images/*`, `/fonts/*` | `max-age=86400` + SWR | plain names, so a day plus revalidation rather than a year no redeploy could clear |
| each page | `max-age=300, must-revalidate` | HTML names the hashed assets, so a stale document pins a visitor to a superseded build. Generated per-path from `site.config.mjs` |

A miss under any of these is a real 404 with `no-store`, because `404.html`
exists — see the trap below for why that one file matters so much.

**Pages applies every matching rule and merges the results.** A `Cache-Control`
under `/*` does not act as a default — it combines with `/build/*` and produced
`max-age=14400, immutable, must-revalidate`. Keep `/*` to security headers only.

That merge was only half of it. The other half brought the site down a second
time with `/*` already clean. Three facts, each fine alone:

1. **Pages answers an unknown path with the app shell under a 200** unless a
   `404.html` exists.
2. **Propagation is not atomic.** Uploading *is*: Wrangler uploads every file
   and only then flips the deployment manifest, so "assets first, HTML last" is
   already guaranteed and cannot be reordered. But for a window after the flip,
   an edge PoP can answer a *present* asset URL with that fallback body.
3. **`immutable` means never revalidate**, so anything cached in that window —
   at the edge or in a visitor's browser — stays for a year.

Together: the edge decides a JS URL is a document, Chrome refuses the module on
MIME grounds, and the page never hydrates.

The second occurrence was self-inflicted. A post-deploy `curl` sweep of all 23
`/build/*` URLs, run seconds after the flip to "verify the deploy", cached the
fallback body under every one of them. The file it broke first had not even
changed in that release. **Sweeping asset URLs during propagation is not a
verification, it is a cache-poisoning tool.**

Five guards now, none of which should be removed:

- `scripts/prerender.mjs` writes `404.html` and **fails the build** if an
  unmatched path does not return 404. Pages then answers a miss with a real 404
  under `no-store` — verified against a preview deployment, not assumed — so
  there is no longer a cacheable wrong answer to pin.
- `scripts/build-seo.mjs` omits `immutable` from `/build/*`. The usual advice
  adds it for fingerprinted files, but the filename already changes with the
  content, so it prevented no revalidation that mattered — it only made a bad
  response permanent. Without it, one ordinary reload heals a poisoned client.
- `scripts/build-seo.mjs` caps every HTML page at `max-age=300`, bounding how
  long a visitor can be pinned to a superseded build.
- `npm run deploy` waits until the domain is actually serving the new build
  before generating load, then purges, then verifies.
- `test/verify-prod.mjs` cold-loads the live domain in Chrome.

Two properties make it deceptive, and both cost real time:

- **`curl` is not a check.** It gets a different cache key than the browser and
  returned correct JavaScript for the same URL Chrome was being served HTML for.
  A green curl means nothing; use the browser.
- **A poisoned client is unreachable.** Purging the edge does not touch it, and
  you cannot tell visitors to hard-reload. Prevention is the whole game.

The hashed asset directory is `/build`, not Vite's default `/assets`, because on
the first occurrence retiring the poisoned path was the only way to recover
without a purge token. The token has one now.

### DNS

Cloudflare creates the apex and `www` records when the Pages custom domain is
attached. Do not hand-copy registrar parking `A`/`AAAA` records into Cloudflare
— those point at the registrar's placeholder page, not at this project.

### Rolling back

Every deploy gets its own permanent `*.pages.dev` URL. To roll back, promote a
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

Four recipe photos survived in `frontend/apps/web/public/images/`: artisan New
York pizza (`charred-crust-pizza.jpg`, renamed from the imported `pizza.jpg`),
brown butter chocolate chunk cookies, French crullers, and pollo asado. The rest
have mixed origins and should be treated as replacements unless noted otherwise:

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

- **american buttercream, vanilla cupcakes** — no original image survived. The
  files were added later as replacements, but their source is not recorded in
  this repository history; keep treating them as unverified replacements until
  their provenance is confirmed.

All twelve recipes now have images.
Searched and came up empty: the working tree, the Next.js image cache, all 53
image files in git history across every branch, Chrome's HTTP and image caches
(which hold only the 160x160 mascot icon), and `~/Downloads`, `~/Desktop`,
`~/Pictures`, `~/Documents`. The originals were S3 objects
(`seed/vanilla-cupcakes-hero.webp` and friends) in the deleted
`yeet-production-images` bucket, and both domains' Route53 zones are gone, so
there is nothing left to fetch. To replace one, drop the file in
`public/images/` and point the recipe YAML `image` field at it.
