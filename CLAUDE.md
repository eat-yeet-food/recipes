# Agent Guide

This repository builds multiple static recipe apps from one pnpm/Nx workspace.
One app config marks itself as the default; other apps are selected with
`APP_ID`.

`AGENTS.md` points here so all agents use one source of repo guidance.

## Required Start

Before implementation work, read `.codex/skills/implement/SKILL.md`. It routes
to the component architecture, owned controls, theme token, and pre-final
verification policies for this repo.

## Layer Rules

Packages are nested under `packages/lN/name` and each package is an Nx project.
The project name must start with the same layer number as its path and carry a
matching `layer:lN` tag.

Current package stack:

- `packages/l0/foundation`
- `packages/l1/api-model`
- `packages/l1/recipe-model`
- `packages/l2/recipe-domain`
- `packages/l3/api-contract`
- `packages/l3/api-query`
- `packages/l3/api-static`
- `packages/l4/content-model`
- `packages/l4/content-build`
- `packages/l5/ui-primitives`
- `packages/l6/ui-catalog`
- `packages/l6/ui-content-blocks`
- `packages/l6/ui-shell`
- `packages/l7/home`
- `packages/l7/recipes`
- `packages/l7/search`
- `packages/l8/web`

Lower layers must not import higher layers. Cross-package imports must be
represented in the importing package's `tsconfig.json` references. Run:

```bash
pnpm run boundaries
pnpm run typecheck:ts
```

## Source Ownership

Root files orchestrate the workspace, active app selection, scripts, and shared
tests. App/runtime source lives in packages.

Use the existing owner for new code:

- foundation helpers: `packages/l0/foundation`
- recipe summary model: `packages/l1/recipe-model`
- API loader/types: `packages/l1/api-model`
- pure recipe operations: `packages/l2/recipe-domain`
- API query client defaults, query keys, query options, and hooks:
  `packages/l3/api-query`
- static API helpers with app-supplied data: `packages/l3/api-static`
- page/content view models: `packages/l4/content-model`
- YAML/content generation: `packages/l4/content-build`
- primitive controls: `packages/l5/ui-primitives`
- shared UI patterns: `packages/l6/*`
- feature composition: `packages/l7/*`
- TanStack routes/bootstrap/styles: `packages/l8/web`
- selected public app config adapter: `packages/l8/web/src/lib/app-config.ts`
- app-owned config, recipe adapters, and app block registries: `apps/<app>`
- selected API client wiring: `packages/l8/web/src/lib/api.ts`

Do not add new root `src/` files.

## Styling

Tailwind compiles from `packages/l8/web/src/styles/global.css`.
Use semantic theme tokens. Do not introduce raw color literals in component
classes when a token should exist.

`site-overrides.css` is for font declarations, root variables, app-specific
surface hooks, and scoped content rules that cannot be expressed on JSX nodes.

Check compiled utility availability before relying on unusual classes:

```bash
pnpm run build
node scripts/has-class.mjs 'mt-12' 'w-[260px]'
```

`pnpm run classes` is part of the build.

## App Registry

`apps/<app>/app.config.mjs` owns that app's origin, route, fixture, public
asset, Doppler, Cloudflare project, copy, categories, and preview path
configuration. `site.config.mjs` discovers app configs by convention and owns
only active app selection plus derived exports. Root scripts import it through
`#site-config`. Do not statically import concrete app configs from root or
shared layers.

Package runtime code must not import `site.config.mjs` directly or climb to the
workspace root. Vite injects the selected app's public runtime config as
`__APP_CONFIG__`; web routes, stories, and SEO helpers consume it via
`packages/l8/web/src/lib/app-config.ts`.

Content generation is orchestrated from `scripts/build-content.mjs`, which
passes the selected app paths from the active app config into
`packages/l4/content-build`. Keep `packages/l4/content-build` independent of
the root app selector.

Generated app data belongs under `apps/<app>/generated`, never under shared
packages. App stubs load their own app's generated `index.json` and
`recipes/*.json`; shared layers may accept that data as input but must not own
or import app-specific generated files.

## API Access

Keep reusable API and query behavior out of the app layer:

- `packages/l3/api-contract` defines request, response, and service contracts.
- `packages/l3/api-query` defines QueryClient defaults, query keys, recipe
  query options, and React Query hooks.
- `apps/<app>/src/recipes.stub.ts` provides the active app's fixture stub
  implementation and loads app-owned generated fixtures.
- `apps/<app>/src/page-blocks.ts` constructs the active app's page block
  registry. Current apps register only shared blocks from the proper package
  layer, but apps can add their own registrations here later.
- Vite maps `@app/recipes` and `@app/page-blocks` to the selected app modules at
  build time; do not reintroduce a runtime selector that statically imports
  every app module.
- `packages/l8/web/src/lib/api.ts` selects the active app stub and creates the
  recipe API access object.

Routes and stories may use the selected API access object from
`packages/l8/web/src/lib/api.ts`, but should not import generated recipe data
or fixture chunks directly. Each app gets its own stub entry point so future
apps can swap transport behavior without changing query code.

## Verification

Before final commit or deploy for app, routing, UI, styling, SEO, or content
changes, run:

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

If a verification command fails, fix the cause or document the blocker.

## Deployment

Deploy the default app:

```bash
doppler run -p yeet -c dev -- pnpm run deploy
```

Deploy a specific app:

```bash
APP_ID=<app-id> doppler run -p yeet -c dev -- pnpm run deploy
```

The deploy script builds, uploads to Cloudflare Pages, purges cache, and verifies
the production origin.

Never deploy `.output/public` manually. `pnpm run deploy` owns the production
safety rails: it deletes any stale build output, rebuilds the selected app,
writes a deploy identity manifest, refuses to upload if the manifest does not
match `APP_ID`, `SITE_URL`, and the Cloudflare Pages project, and passes
`--branch main` to Wrangler so deployments from an isolated worktree still
target the production Pages branch instead of a preview alias. This prevents
build output for one app from being uploaded to another app's production
project.
