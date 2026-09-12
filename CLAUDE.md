# Agent Guide

Eat / Yeet uses Next.js App Router and Payload with Git-owned YAML content. Local Cloudflare D1/R2 emulation and remote release tooling are implemented; remote acceptance and cutover require verified account access. `AGENTS.md` points here as the canonical project guide.

## Required start

Read `.codex/skills/implement/SKILL.md` before editing. Apply the component architecture, owned controls, theme token, and pre-final verification policies. Read `.codex/skills/design-system/SKILL.md` and `docs/design-system.md` for branded UI work.

Read `docs/payload-local.md` for current setup, sync, migration, security, and verification commands. Implementation evidence lives under `docs/changes/payload-local`.

## Ownership and package boundaries

Packages live under `packages/lN/name`, with matching Nx names/tags. Imports may go to the same or lower layers only. Every cross-package import needs a package dependency and TypeScript project reference. Root files orchestrate; do not create root runtime `src` files. App source can compose l0–l7, but cannot import web composition or another app.

- l0 foundation: environment-free helpers.
- l1 models: recipe/article summaries and API data models.
- l2 recipe-domain: calculations, formatting, formula persistence, filtering/search.
- l3 api-contract/query/static: provider-independent services, query helpers, Storybook fixture transports.
- l4 content-model: normalized recipe/article/block view models.
- l4 content-build: parsing, safe Markdown, source validation, derivative generation, upsert/media synchronization primitives.
- l4 content-cms: Payload schema/access rules and provider-independent service adapters.
- l5 ui-primitives: shared controls, navigation interface, responsive images.
- l6 UI packages: shell, catalog, content blocks.
- l7 features: home, search, learn, recipes/workbenches.
- l8 web: Next route composition, request-driven Payload wiring, metadata, styles and Storybook.
- `apps/<app>`: Git sources, app configuration and executable plugin/block registries.

Run `pnpm boundaries` and `pnpm typecheck:ts`. The boundary checker covers aliases, dynamic literal imports, tests, app source and generated-fixture ownership. Only designated web composition entrypoints may import `@app/*`; expand that allowlist deliberately.

## Runtime and Git content

Public requests must read Payload, never generated fixture JSON or source YAML. `packages/l8/web/src/next/cms.ts` is server-only. `content-cms/service.ts` returns existing view models; keep Payload types out of public contracts and UI layers. Request-driven Local API calls require `overrideAccess: false`. Privileged bootstrap/sync code stays in CLI entrypoints.

Recipes, method variants and Learn articles share the typed Payload block definitions in `content-cms/src/blocks.ts`. The storage codec in `content-model/src/storage.ts` reconstructs the common public block model and separates authored IDs from Payload IDs. Do not fork block definitions by content collection.

Author-facing metadata uses native fields generated from `content-model/src/field-shapes.ts`, including calculator defaults, learning references and SEO. Keep machine fields hidden. Keep large optional learning/calculator sections in shallow child rows: D1 limits both query columns and expression depth. Preserve null/absent fields, authored IDs and numeric/text yield types through the storage codec. Hidden legacy JSON is retained for older revisions, not used by current synchronized public reads.

Git owns recipes, articles, categories, copy, navigation, author information and SEO defaults. Source images stay in Git. Generated derivatives, database/storage state and secrets are ignored. Explicit immutable `sourceId` values own record identity; preserve section/item IDs and browser storage keys. Missing source files never implicitly delete or unpublish data. Explicit states are draft/published/archived. Content is synchronized only by `content:sync`, never by server startup.

Sync validates all sources before writes and uploads required media before publishing references. Repeated runs must be no-ops; drift repair must preserve database IDs and authentication data. Keep old derivative objects for safe retries and older responses. There is no collection-wide atomicity and no automatic rollback of already-synchronized content after a release failure.

Payload admin and APIs are read-only even for the owner. Owner bootstrap and recovery are CLI-only. Do not enable first-user registration, public signup, web uploads, editing, or GraphQL. Preserve origin checks, owner allowlisting, revocable sessions and lockout rules. Local security assumes a trusted OS account. Remote hosting requires owner-only Cloudflare Access with MFA and alternate-hostname protection, enforced by the Worker request guard.

Local launchers bind `127.0.0.1`; remote bindings are disabled. Wrangler's CLI persistence path is the parent of the `v3` directory used by `getPlatformProxy`. Keep those paths aligned. Server startup never pushes the schema; use tracked migrations and `pnpm db:migrate`.

`site.config.mjs` discovers `apps/<app>/app.config.mjs`. Root orchestration selects the active app. Runtime components must not import root config. Next's build config resolves the selected app's executable modules. Authored site configuration arrives through Payload. Vite and generated JSON are retained for Storybook and historical tooling only.

## Images, SEO and caching

Sharp runs only during local sync. Derivative keys include source bytes, transformation settings, Sharp/libvips versions and pipeline version. Bump the pipeline when transformations change. Never upscale ordinary responsive variants. Use the shared `<picture>` component, correct `sizes`, reserved dimensions and one primary eager/high-priority image. Keep originals out of normal delivery. Errors must be non-cacheable and must never return HTML with an image URL.

Public content-addressed derivatives have long cache lifetimes without `immutable`, retaining browser reload/revalidation behavior. Draft/private media requires authorization. Do not make the bucket public. Remote public delivery uses a custom media domain, not `r2.dev`.

Metadata is server-rendered, uses a trusted canonical origin and strips query parameters. JSON-LD reflects the authored default recipe; never invent reviews/nutrition. Local indexing is disabled by default. SEO tests explicitly enable production indexing policy on loopback. Sitemaps include published/indexable records only. Previews require owner auth and no-store/noindex.

## Styling and design

Tailwind compiles `packages/l8/web/src/styles/global.css`. Use semantic tokens; avoid raw component colors. `site-overrides.css` is for fonts, root variables, scoped content and app surface hooks. Shared owned controls should remain shared across pages and Storybook.

`docs/design-system.md` defines Yellow + ink. Filled/outlined labels remain plain; borderless text actions use the shared unpadded, underlined treatment. Selection radii derive from an outer radius and inset. Preserve the approved yellow-icing/orange-dough favicon.

Check compiled utility availability with `pnpm classes` or `node scripts/has-class.mjs 'mt-12'`. These read the public Next CSS, excluding Payload admin CSS. Ignore generated Next/OpenNext output in source policy scans.

## Verification

For app, routing, styling, SEO, content or dependency changes:

```sh
pnpm test
pnpm test:a11y
pnpm test:lighthouse
pnpm test:security
pnpm shots
pnpm parity
```

`pnpm test` covers design policy, units, boundaries, TypeScript, a production build, isolated sync/security integration, raw HTTP/SEO checks, browser recipe/interaction behavior and rendered Storybook with axe/play functions. Review incomplete findings in `dist/app-a11y.json` and `dist/storybook-a11y.json`; automated passes do not replace keyboard/visual review. Inspect old/new/diff screenshots before accepting a baseline. Never update baselines just to make tests green.

Lighthouse requires three comparable mobile production-preview runs per representative route: median performance ≥90, LCP ≤2.5 seconds, CLS ≤0.1. Record local results as local lab evidence; production network/CDN performance is separate. Image delivery reports must verify selected URLs, transfer sizes, missing/private responses and hydration downloads.

Use `pnpm build:worker && pnpm preview` for a local Workers smoke test. Tests may use isolated state under `.local`; never overwrite the development owner. If a required command fails, fix it or record its exact unresolved blocker. Keep security overrides scoped to affected dependency versions.

## Deployment and remote handoff

Read `docs/payload-remote.md` for the remote workflow and its current deployment blockers. Use `pnpm run deploy --env staging|production` from a clean immutable commit. Cloudflare infrastructure, configuration, domains and Access policies belong to locally operated Pulumi TypeScript; direct Wrangler deployment is outside the workflow. Wrangler dry-run bundling and explicit remote Node D1/R2 bindings are allowed.

Credentials live in environment-specific macOS Keychain entries. Runtime secrets use Cloudflare Worker secret bindings. No Doppler project or workflow is used. Pulumi state is private R2 with passphrase encryption and timestamped backups. All remote mutation commands share an exclusive conditional R2 lock as well as Pulumi stack locking. Expired heartbeats are interrupted work, never permission to steal a lock. Recovery must establish that child writers and outstanding operations have stopped; revoke credentials if uncertain.

Preserve Git-only content, stable IDs, authentication data and browser saves. Public derivatives remain privately stored and publication-checked before cached delivery. Public HTML stays dynamic; public data projections use generation-keyed OpenNext R2 caching. Failures after content mutations preserve maintenance until recovery. Application rollback never implicitly undoes content or migrations.

Production requires staging acceptance for the exact commit, including recovery, MFA/owner review and performance. Do not invent account/resource IDs or claim remote verification from local tests. After deployment, run `pnpm verify:prod [origin]` for the Worker contract and production mobile performance measurements. Keep the prior Pages deployment/DNS for route rollback until cutover is verified.
