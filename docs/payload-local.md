# Local Payload operations

## Setup and lifecycle

Use the pinned pnpm version in `package.json`, Node 22.13 or newer, and install with `pnpm install --frozen-lockfile`. The implementation was verified on Node 25.2.1; Node 24 LTS is the recommended maintained development runtime.

1. `pnpm local:setup` creates `.local/runtime.json` with a random secret and applies the checked-in D1 migrations. It does not import content or create an account.
2. `pnpm owner:bootstrap` prompts for the owner's email and a hidden password (9 characters minimum). Only an empty owners collection can be bootstrapped.
3. `pnpm content:plan` validates the complete source set, prepares/reuses derivatives, and reports proposed changes without database/storage writes.
4. `pnpm content:sync` explicitly imports content and media. Unchanged reruns preserve database identities and version counts.
5. `pnpm dev` starts Next.js on `http://127.0.0.1:3000`. `/admin` is the read-only owner panel.

`pnpm build && pnpm serve` runs the production Next server. `pnpm build:worker && pnpm preview` builds OpenNext and starts Wrangler with `--local`; no resources are provisioned. Both use the same persistent D1/R2 state. Stop the previous server before reusing its port. Set `LOCAL_ORIGIN=http://127.0.0.1:3001` to use a different port. Non-loopback origins are rejected by the local launcher.

Wrangler is Cloudflare's CLI and local runtime emulator. The pinned configuration declares local D1 and R2 bindings with `remote: false`. `getPlatformProxy` takes a persistence directory ending in `v3`; Wrangler's `--persist-to` takes its parent. Do not change one without the other.

`.local`, Next/OpenNext outputs, generated Storybook fixtures, and `.dev.vars` are ignored by Git. `.local/runtime.json` and the generated Worker `.dev.vars` have mode 0600. Do not commit them. No credentials are needed for local development. The emulator's own developer tools share the trusted local-machine boundary.

## Content ownership and synchronization

Recipes and articles remain in `apps/eatyeet/fixtures/{recipes,articles}/*.yaml`. `apps/eatyeet/site.yaml` owns site copy, navigation, categories, author name, SEO defaults, and optional media metadata. Source images remain in `apps/eatyeet/public/images`. Executable workbench plugins and layout registries stay in application code.

Every content record has an explicit immutable `sourceId` and slug. Existing section/item IDs are now materialized in YAML without changing their normalized values. Preserve IDs when editing or moving files. Slug changes are rejected pending a separate redirect-management phase. Category IDs are explicit in `site.yaml`.

`draft`, `published`, and `archived` are explicit states. Only published records are public. Missing files are left alone: absence never deletes or retires a record. Set `status: archived` and synchronize to retire it. Physical deletion and garbage collection are deferred.

Synchronization validates the whole source set before writes: identities/slugs, safe Markdown, source image containment/format/size, references, structured blocks, and executable workbench configuration. It replaces the normalized Git-owned content object and ordered arrays, clears removed optional fields, and repairs drift. Payload IDs, owner accounts, timestamps, and version history are outside authored ownership. The recorded Git revision identifies the last applied source change; a new unrelated commit does not create new content versions.

Each sync has a local exclusive `.local/content-sync.lock`. If a process is killed, verify the recorded PID is no longer running before removing that file and retrying. The importer is repeatable after partial failure; it does **not** promise collection-wide atomicity. Required derivative objects are written before media references, content records, and the final site settings are updated. No deployment automatically rolls back content already synchronized.

Reports are written to `dist/content-plan.json` and `dist/content-sync.json`. They include record actions, image sizes, derivative URLs, and the source Git revision. A failed run exits nonzero and must be retried before considering synchronization complete. Do not interpret an earlier successful report as the status of a failed later run.

## Shared article blocks

Recipes, recipe method variants, and Learn articles reuse the same Payload Blocks field definitions in `packages/l4/content-cms/src/blocks.ts`. Markdown, images, callouts, steps, comparisons, footnotes, YouTube, structured recipe sections, and nested sections have typed fields. The common metadata projection stays separate from the reusable block body. Sections support two nesting levels, validated before synchronization; the existing content uses one.

The admin presents named fields under Overview, Timing & yield, Learning references, Calculator defaults, Content blocks, Recipe methods, and SEO & sharing. Articles reuse the common overview, block, and SEO fields. `content-model/src/field-shapes.ts` defines the shared metadata shapes, and `content-cms/src/authored-fields.ts` builds their native Payload fields. Calculator configuration is also modeled as named fields. Unmodeled configuration keys fail synchronization rather than disappearing silently.

The optional learning and calculator sections occupy separate single-row arrays in SQLite. Their inner groups stay shallow: flattening everything into the recipe exceeds D1's result-column limit, while putting every nested group in another table exceeds its expression-depth limit. Tiny hidden field-presence markers preserve null/absent values, empty arrays/maps, and numeric versus text yields. The public adapter removes all storage metadata. Legacy JSON columns remain hidden for old revisions; current synchronized recipes/articles use the typed fields exclusively.

`packages/l4/content-model/src/storage.ts` converts `blockType` and Payload array IDs at the storage boundary. Public services reconstruct the existing `PageBlock` model. Authored recipe section/item identifiers use dedicated fields and are never replaced by Payload's internal IDs. Method variants use the same block definitions and conversion. Shared block changes should be made once and verified against both recipe and Learn round-trip tests.

## Images

Sharp runs in the local CLI, never in a Worker request handler. It rotates images, converts to sRGB, strips metadata, and generates AVIF/WebP widths 160, 320, 640, 960, 1440, and 1920 when applicable, plus a capped source-sized variant. Ordinary variants never upscale. A JPEG social crop is at most 1200×630. An authored `seo.image` overrides the social image for a record; the site's existing default sharing photo is retained.

Optional source metadata in `site.yaml`:

```yaml
media:
  charred-crust-pizza.jpg:
    alt: New York style pizza with a charred golden crust
    focalPoint: [0.5, 0.4]
```

Focal coordinates range from zero to one. They control the social crop and object positioning in existing cropped layouts. Review crop screenshots when changing a focal point or sharing override.

Derivative identity includes source bytes, transformation settings, and pipeline version. Identical sources share generated objects; changed images receive new URLs. Per-record media references and the public site media map select active hashes. Previous objects remain available for older page responses and safe retries.

Public `<picture>` elements use AVIF with WebP fallback, layout-specific sizes, and reserved dimensions. Only the primary visible image gets eager/high priority loading. Below-fold images are lazy, and command-palette thumbnails request small variants. Originals are not copied to the public Next directory.

`/media/<hash>/<variant>` checks Payload visibility before reading R2. Successful public objects carry MIME type, length, ETag, and a one-year cache lifetime without `immutable`; reload/revalidation remains possible. Private media is `private, no-store`. Missing files return an empty, non-cacheable 404, never HTML. Legacy `/images/...` paths redirect to the currently active derivative. Previously public bytes cannot be recalled from a browser's existing cache merely by changing publication state.

Remote delivery will use a custom R2/CDN media domain for deliberately public derivatives. Do not use `r2.dev` for production delivery. Private media and originals must remain separate from public delivery.

## Owner security and recovery

The OS account and local secret files are trusted. Payload hashes passwords and uses revocable, HTTP-only SameSite=Lax sessions with a two-hour expiry. Five failed logins cause a ten-minute lockout. Future HTTPS hosting must use secure cookies and Cloudflare Access with owner identity and MFA, including protection against alternate-hostname bypasses.

The configured email is the only owner identity. Bootstrap/recovery are isolated CLI operations; public registration, first-user creation, password-reset email flows, and additional administrator creation are blocked. Web content creation, updates, uploads, deletion, publishing, and version restoration are denied even for the owner. Collections expose read-only fields; previews and versions require the owner. Request-driven Local API calls explicitly use `overrideAccess: false`. Privileged sync/bootstrap calls are never imported by HTTP entrypoints. GraphQL is disabled. Invalid request origins are rejected.

Run `pnpm owner:recover` with the existing owner's email and a new hidden password. Recovery resets the password, clears lockout, and revokes every existing session. It requires no email provider. Restart servers after changing owner configuration. Environment-based `OWNER_BOOTSTRAP_EMAIL` and `OWNER_BOOTSTRAP_PASSWORD` are supported for isolated automation; do not put passwords in command-line arguments or checked-in files.

Authenticated previews are `/preview/recipes/<slug>` and `/preview/articles/<slug>`. They are dynamic, private/no-store, and noindex. To publish, change Git source state and run sync.

## Schema migrations

Migrations live in `packages/l8/web/migrations`. `pnpm db:migrate` applies pending local migrations; ordinary server startup never pushes a schema. After changing the Payload schema, generate a migration using `pnpm exec tsx scripts/content-cli.ts migration:create descriptive_name`, inspect the generated TypeScript and snapshot, and test it on fresh and existing local state. Never run destructive migration rollback commands against someone else's database.

The admin's generated import map is tracked at `packages/l8/web/src/app/(payload)/admin/importMap.js`. Run `pnpm generate:importmap` after adding or changing admin components/plugins and commit its output. This command inspects the schema without opening local storage. The admin layout, page and server actions must all use that same map; an empty map breaks plugin components even when uploads are disabled.

CLI CMS initialization disables Payload's Next HMR subscription. Without this, bootstrap/sync/test commands can remain alive after successful cleanup while a development server is running on port 3000.

## SEO and verification

Trusted `SITE_URL` configuration controls canonical and absolute social URLs. Calculator, search, and tracking parameters never enter canonicals. Server metadata supplies title, description, Open Graph, Twitter cards, and safe Recipe/Article/Breadcrumb JSON-LD without browser JavaScript. Sitemaps query published, indexable Payload records on every request. Local default robots policy is noindex; test harnesses explicitly use `SEO_AUDIT=1` on loopback to audit the intended production indexing policy. Do not enable indexing for a public preview deployment.

`pnpm test` runs design policy, unit tests, boundaries, TypeScript, production build, isolated content/security integration, HTTP/SEO checks, browser interactions/recipe flows, and rendered Storybook checks. `pnpm test:a11y` covers desktop/mobile page states and retains incomplete axe findings. `pnpm test:lighthouse` runs three mobile measurements for six representative routes. It enforces median performance ≥90, LCP ≤2.5 seconds, CLS ≤0.1, accessibility ≥95, and SEO 100. `pnpm test:security` audits the full lockfile.

`pnpm shots` captures desktop/mobile pages and workbench states. `pnpm parity` compares them with reviewed baselines; inspect differences rather than automatically accepting them. Image selection and transfer-size evidence belongs in `dist/image-delivery.json`; runtime, image, accessibility, Storybook, and performance reports are local lab evidence. Production latency and CDN behavior require separate verification during the remote phase.
