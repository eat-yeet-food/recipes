# Agent guide

The Eat / Yeet recipe archive: 12 YAML fixtures rendered by TanStack Start
into a fully prerendered static site on Cloudflare Pages at eatyeet.com.
No database, no API, **no server at runtime**.

Read `README.md` for the full picture. This file is the short list of things
that have already gone wrong here.

`CLAUDE.md` is the source of truth for centralized agent and repo-skill
guidance. Repo-specific adapters such as `AGENTS.md`, and any future local
skills, should point here instead of copying workflow rules. If deployment
changes, update this file and the README deploy runbook together so Claude,
Codex, and subagents inherit the same command.

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

## 2. Know which surfaces still follow the original

`/Users/phoganuci/src/yeet/frontend/apps/web/src/` holds the React components
this was transcribed from. **Read them before changing markup or classes** on
the home, browse, search, card, nav, footer, and command-palette surfaces.
Every ported component here names its source at the top.

Three surfaces have deliberately left the original. Do not "restore" any of
them without being asked:

**`/browse`** no longer uses the original's plain text cards. Its four facet
sections render the home grid's photo card, so "View all categories" leads to a
page that looks like the grid it came from. Categories without a curated image
borrow a recipe photo; see the note in `src/routes/browse.tsx`.

**Not-found and error states** are ours; the original had none worth porting.
`components/error-states.tsx` owns all three — a bad URL, a route that threw,
and a stale-build chunk failure — and they share one frame on purpose, so a
visitor cannot tell which subsystem failed. They are wired at
`router.tsx` (`defaultErrorComponent`, `defaultNotFoundComponent`) and at
`__root.tsx`, and are covered by the `DeadEnds` Storybook story. The stale-build
variant is not decoration: a failed dynamic import means the browser is holding
a build that no longer exists, and a reload is the actual fix, so it says so
instead of offering a retry that re-runs the same broken module graph.

**Recipe detail pages** are no longer the original layout. The canonical
`components/recipe.tsx` wrapper renders `components/recipe-butternut-trial.tsx`,
which contains the Butternut-inspired article card, print/pin controls, cook
mode, local Geller/Avenir font usage, and desktop-only "Browse Recipes" sidebar.
Do not restore the old full-bleed hero or centered recipe card unless explicitly
asked.

`~/src/yeet` is **read-only**. Never modify anything under it.

`format.ts`'s `humanizeMinutes` and `formatYield` are exact ports. `formatTime`
keeps minutes alongside days ("4 days 4 hr 37 min"); `formatYield` does **not**
pluralize ("2 16-inch pizza"). Changing either drifts card and header text.

## 3. Verify visually, not just by assertion

A control can render perfectly and be wired to nothing — a screenshot cannot
tell. A pixel diff cannot tell you a link points at the wrong page.

```bash
npm test          # build + static + interaction + guard self-tests
npm run test:recipe-pages  # focused recipe redesign coverage
npm run storybook # real Storybook at 127.0.0.1:6006
npm run build-storybook # static Storybook build; also covered by npm test
npm run parity    # pixel-diff against a baseline
npm run serve     # look at it: 127.0.0.1:4321, served as Pages serves it
npm run verify:prod [origin]  # cold-load the deployed site in Chrome
```

`verify:prod` is the only check that sees what a visitor sees. Everything above
it tests the artifact; that one tests the artifact *plus* the edge in front of
it, and those can disagree — see section 6.

Take screenshots and **actually look at them** when changing layout. Reusable
visual decisions should also be represented in real Storybook stories under
`src/stories/`, including type, color, button, link, form, card, grid, and
recipe-page patterns.

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

Internal noindex app pages such as the historical
`/recipes/artisan-new-york-pizza/butternut-trial` route belong in
`TRIAL_PATHS`. They are prerendered for local/review use, but `build-seo.mjs`
keeps them out of the sitemap. Storybook is not an app route; it lives in
`.storybook/` and `src/stories/`.

## 6. A missing asset must 404, or the edge pins HTML under its URL

Cloudflare Pages applies *every* matching `_headers` rule. A `Cache-Control`
under `/*` does not act as a default; it combines with `/build/*`. Keep `/*` to
security headers only.

The deeper trap, which has now bitten twice. Three facts that are each fine
alone and lethal together:

1. **Pages answers an unknown path with the app shell under a 200** unless a
   `404.html` exists.
2. **Propagation is not atomic.** Uploading is — Wrangler uploads every file and
   only then flips the manifest, so "assets first, HTML last" is already handled
   and cannot be reordered. But for a window after the flip, an edge PoP can
   answer a *present* asset URL with that fallback body.
3. **`immutable` means never revalidate.** Anything cached in that window, at
   the edge or in a browser, stays for a year.

Result: a JS URL that the edge believes is a document. Chrome refuses the module
on MIME grounds and the site does not hydrate.

The second occurrence was self-inflicted: a post-deploy `curl` sweep of all 23
`/build/*` URLs, seconds after the flip, cached the fallback body under every
one of them. **A sweep of asset URLs during propagation is not a verification,
it is a cache-poisoning tool.** Do not write one.

Five guards, none of which should be removed:

- `scripts/prerender.mjs` writes `404.html` and **fails the build** if an
  unmatched path does not return 404. Pages then answers a miss with a real 404
  under `no-store`, so there is no longer a cacheable wrong answer at all.
  `test/verify.mjs` checks the file ships.
- `scripts/build-seo.mjs` omits `immutable` from `/build/*`, so a bad response
  self-heals on the next ordinary reload instead of lasting a year.
- `scripts/build-seo.mjs` caps every HTML page at `max-age=300`. Documents name
  the hashed assets, so a stale one pins a visitor to a superseded build; five
  minutes bounds that. The rules are generated from `site.config.mjs` and are
  per-path because a `Cache-Control` under `/*` would merge onto `/build/*`.
- `npm run deploy` waits until the domain actually serves the new build, purges,
  and only then verifies.
- `test/verify-prod.mjs` cold-loads the live domain in Chrome.

If one gets through anyway, `components/error-states.tsx` catches the fallout:
a failed chunk import renders "Reload to Continue" in the site's own type rather
than TanStack's bare panel. That is a cushion, not a fix — see section 2.

And two properties that make it deceptive:

- **`curl` is not a check.** It gets a different cache key than the browser and
  returned correct JavaScript for the very URL Chrome was being served HTML for.
  A green curl means nothing. Use the browser.
- **A poisoned client is unreachable.** Purging the edge does not touch it. With
  `immutable` gone an ordinary reload fixes it; while it was set, only a hard
  reload did, and there was no way to tell visitors.

## 7. Don't fabricate provenance

All twelve recipes currently have photos, but not every photo is original to the
old platform. Do not silently treat replacements as recovered originals. State
gaps and substitutions plainly.

`README.md`'s "Image provenance" section records where every image came from,
including the ones that are not photographs of these dishes. Keep it accurate.

## 8. Recipe fixtures are YAML, not Markdown files

Fixtures live in `fixtures/recipes/*.yaml`. Recipe body fields are structured
as YAML arrays, but each displayed string inside `equipment`, `ingredients`,
`steps`, `notes`, and `tips` is inline Markdown source rendered by
`scripts/parse.mjs` at content-build time. Do not reintroduce frontmatter plus
Markdown body parsing; the YAML schema exists so editors can lint the document
shape while recipe prose still gets links and emphasis.

## 9. Deploy through Doppler in non-interactive shells

Cloudflare credentials live in Doppler. In Codex and other non-interactive
shells, plain Wrangler fails because `CLOUDFLARE_API_TOKEN` is not set. Use:

```bash
doppler run -p yeet -c dev -- npm run deploy
```

Deploy only `.output/public` after a passing `npm test` or a known-good
`npm run build` plus targeted test run.

`npm run deploy` is wrangler **plus** an edge purge **plus** a browser check of
the live domain, in that order. Do not hand-run the wrangler line instead: a
deploy is not atomic at the custom domain, and skipping the purge or the
verification is how section 6 happened. The token needs Pages:Edit, Zone:Read,
and Cache Purge.

`npm run verify:prod [origin]` runs the browser check alone. Point it at a
`*.pages.dev` deployment URL to judge the artifact, or at eatyeet.com to judge
what visitors actually get — they can disagree, and only the second one is the
site.

Centralized skills and adapter docs should refer to this section and the README
runbook. Do not encode a separate Wrangler deploy command anywhere else.
