# Recipes

Multi-app static recipe sites built with pnpm workspaces, Nx project metadata,
TanStack Start, Vite, and Cloudflare Pages.

One app config marks itself as the default. Additional apps share the same
package stack and select their content/assets with `APP_ID`.

## Commands

```bash
pnpm run dev
pnpm run build
pnpm run serve
pnpm test
pnpm run test:a11y
pnpm run test:lighthouse
pnpm run typecheck
pnpm run boundaries
pnpm run build-storybook
doppler run -p yeet -c dev -- pnpm run deploy
```

Use `APP_ID=<id>` to build or serve another registered app:

```bash
APP_ID=<app-id> pnpm run build
APP_ID=<app-id> pnpm run serve
```

Registered apps are discovered by `site.config.mjs` from
`apps/<app>/app.config.mjs`. Each app config owns fixture directory, public
asset directory, generated output directory, origin, Cloudflare Pages project,
Doppler config, copy, categories, preview paths, and whether it is the default.

## Architecture

Packages are nested by layer under `packages/lN/name`. Package names remain
npm-valid, for example `packages/l0/foundation` is imported as
`@eat-yeet/l0-foundation`.

Lower layers may import same-layer or lower-layer packages only. Every package
has a `project.json` with a matching `l<number>-` project name and
`layer:l<number>` tag, and every cross-package import must be mirrored by a
TypeScript project reference. `pnpm run boundaries` enforces both rules.

| Layer | Package | Owns |
|---|---|---|
| l0 | `packages/l0/foundation` | tiny env-free utilities |
| l1 | `packages/l1/recipe-model` | recipe summary model and image URL helpers |
| l1 | `packages/l1/api-model` | generic API/loader contracts |
| l2 | `packages/l2/recipe-domain` | formatting, facets, filtering, search helpers |
| l3 | `packages/l3/api-contract` | app-facing recipe/category contracts |
| l3 | `packages/l3/api-query` | React Query client defaults, query keys, recipe query options, and API hooks |
| l3 | `packages/l3/api-static` | static recipe API helpers with app-supplied data |
| l4 | `packages/l4/content-model` | post-API page/content view models |
| l4 | `packages/l4/content-build` | app path resolution, YAML parsing, generated JSON writer |
| l5 | `packages/l5/ui-primitives` | shadcn/Radix/cmdk primitives |
| l6 | `packages/l6/ui-shell` | nav, footer, wordmark, global error states |
| l6 | `packages/l6/ui-catalog` | recipe cards, browse cards, grids, section headings |
| l6 | `packages/l6/ui-content-blocks` | generic content block rendering |
| l7 | `packages/l7/home` | home page feature composition |
| l7 | `packages/l7/search` | search page and command palette feature composition |
| l7 | `packages/l7/recipes` | recipe detail feature composition |
| l8 | `packages/l8/web` | TanStack routes, injected app config adapter, selected app module loading, router bootstrap, SEO helper, global styles, Storybook stories |

Root files are orchestration only: workspace config, active app selection,
build/deploy scripts, shared tests, and top-level TypeScript/Nx config.

## App Registry

`apps/<app>/app.config.mjs` is the app-owned source of truth for app copy,
categories, paths, origin, preview paths, default status, and deploy target.
`site.config.mjs` discovers app configs by convention, exports the active app
from `APP_ID`, and is read by root orchestration: Vite, content generation,
prerendering, sitemap/robots/header generation, local serving, production
verification, and deploy.

Package runtime code does not import `site.config.mjs`. Vite serializes the
selected app's public runtime config into `__APP_CONFIG__`, and
`packages/l8/web/src/lib/app-config.ts` is the web package's local adapter for
site name, origin, copy, categories, and default OpenGraph image. Root scripts
use the `#site-config` package import instead of relative climbs.

Generated app data is owned by the selected app, not by shared packages. Root
`scripts/build-content.mjs` writes `index.json` and `recipes/*.json` under
`apps/<app>/generated`. It passes the selected app paths into
`packages/l4/content-build`, keeping the content-build package independent of
the root registry.

API access follows the same client/query shape across apps:

- `packages/l3/api-contract` owns request/response/service types.
- `packages/l3/api-query` owns QueryClient defaults, query keys, recipe query
  options, and query hooks.
- `apps/<app>/src/recipes.stub.ts` owns the app-specific generated recipe adapter.
- `apps/<app>/src/page-blocks.ts` owns the app-level page block registry.
- Vite maps `@app/recipes` and `@app/page-blocks` to the selected app modules at build time.
- `packages/l8/web/src/lib/api.ts` wires that active app stub into the shared
  API query layer.

The current stubs read their own app's generated summary/body chunks from
`apps/<app>/generated`. A real transport can replace those stubs without
changing routes or feature packages.

## Routes

The web app is fully prerendered. There is no runtime server on Cloudflare
Pages.

| Route | Purpose |
|---|---|
| `/` | home |
| `/recipes` | full recipe listing |
| `/recipes/<slug>` | recipe detail |
| `/browse` | browse by category/facet |
| `/search` | interactive search and filters |
| `/sitemap.xml`, `/robots.txt`, `/_headers` | generated after prerender |

`/search` is prerendered once. Query strings do not select different files on
Pages, so the search route renders an unfiltered first client pass and applies
query params after hydration.

## Styling

Tailwind v4 compiles from `packages/l8/web/src/styles/global.css`.
App-specific overrides and scoped content rules live in
`packages/l8/web/src/styles/site-overrides.css`.

Before relying on a utility class, verify it exists in the compiled build:

```bash
pnpm run build
node scripts/has-class.mjs 'mt-12' 'w-[260px]'
```

`pnpm run classes` runs after Vite build and fails when source uses a class that
the compiled CSS does not define.

## Verification

Before a production deploy or final handoff for app, UI, route, content, SEO, or
styling changes, run:

```bash
pnpm test
pnpm run test:a11y
pnpm run test:lighthouse
```

For a non-default app before launch, also run:

```bash
APP_ID=<app-id> pnpm run build
APP_ID=<app-id> node scripts/verify-build.test.mjs
```

## Deploy

Default app deploy:

```bash
doppler run -p yeet -c dev -- pnpm run deploy
```

Specific app deploy:

```bash
APP_ID=<app-id> doppler run -p yeet -c dev -- pnpm run deploy
```

The deploy script builds the selected app, uploads `.output/public` to the
configured Cloudflare Pages project, purges relevant cache, and runs production
verification against the app origin.

Do not upload `.output/public` directly with Wrangler. The deploy script first
removes stale build output, rebuilds the selected app, writes a deploy identity
manifest, and refuses to upload if the built artifact does not match the active
app, origin, and Cloudflare Pages project. It also forces the Pages branch to
`main`, so deploys from a separate worktree still update production rather than
a preview deployment.
