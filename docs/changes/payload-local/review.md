# Local Payload migration review

Implementation is being verified on the `main` checkout at `/Users/phoganuci/src/recipes`, based on `cb74614`. No production resources have been provisioned or changed. The migration is prepared for the user-requested source commit; production deployment remains unimplemented.

The public application now uses Next.js App Router and Payload Local API reads. Recipes, Learn articles and method variants share typed Payload blocks; the codec preserves the common public block model and authored section/item identities. CLI imports are Git-driven and separate from request entrypoints. Read-only owner access is enforced by collection/global access rules and HTTP mutation guards.

Local D1 migrations and persistent R2 state are shared by Next development, production Next preview, and Wrangler's local Worker preview. Original images remain in Git; the sync pipeline generates content-addressed responsive AVIF/WebP sets and JPEG social images. Public/private visibility is checked before object delivery. Browser-selected variants and transferred bytes are reported separately from generated sizes.

## Evidence collected

- Initial original-site baseline: `dist/performance-before.json`, from the preserved pre-migration production build in `/tmp/eatyeet-before-public`.
- Sync planning and completed imports: `dist/content-plan.json`, `dist/content-sync.json`.
- Fresh-schema, no-op/version-count, drift, retirement, retry and owner/session checks: `dist/content-acceptance.json`.
- Raw HTTP metadata, canonical, JSON-LD, sitemap and media checks: `dist/runtime-http.json`.
- Device-specific image choices and transfer sizes: `dist/image-delivery.json`.
- Font source/delivery sizes: `dist/font-sizes.json`.
- Desktop/mobile page-state accessibility: `dist/app-a11y.json`.
- Rendered Storybook axe/play checks: `dist/storybook-a11y.json`.
- Current screenshots and visual diffs: `dist/shots`, `dist/diff`.

Final performance figures, completed verification commands, visual review, and remote handoff are added after the remaining acceptance runs. Earlier intermediate Lighthouse results are diagnostic only.

### Named-field follow-up verification

`pnpm test` now completes successfully: 60 unit tests, boundaries/TypeScript/build, isolated content/security/admin integration, 24 public HTTP routes, 37 interaction checks, 134 recipe checks, and 90 Storybook stories at two widths. `pnpm test:a11y` passes 39 page/state checks. `pnpm test:security` reports no known vulnerabilities. The integration suite verifies actual named fields and hidden legacy JSON in an authenticated browser; its screenshot was visually reviewed.

The current three-run mobile Lighthouse medians (`dist/performance-after.json`) are:

| Route | Performance | LCP | CLS |
| --- | ---: | ---: | ---: |
| `/` | 99 | 2.193 s | 0.0030 |
| `/recipes` | 99 | 1.888 s | 0.0002 |
| `/browse` | 90 | 3.575 s | 0.0011 |
| `/learn` | 99 | 2.000 s | 0.0002 |
| `/recipes/new-york-style-pizza` | 93 | 3.079 s | 0.0008 |
| `/learn/mixing-dough-and-gluten-development` | 98 | 2.295 s | 0.0002 |

All measured routes score 100 for SEO and accessibility. `pnpm test:lighthouse` still exits 1 because browse and recipe-detail LCP exceed the 2.5-second acceptance target. The broader migration's performance acceptance, final visual review, final Worker rebuild/smoke, and remote-phase handoff remain open; these local results do not certify production latency/CDN behavior.

Verification also fixed delayed first-open search behavior and browser Back restoring the recipe formula. CLI initialization now disables Payload's HMR websocket, which otherwise kept successful bootstrap/sync/integration processes attached to a running development server. Preview tests clean up their own process groups and drain/cancel HTTP response bodies.

## Design decisions

Recipes and articles now expose native named Payload fields for overview information, timing/yield, learning references, calculator configuration, and SEO. Shared metadata shapes and their lossless storage codec replace the former visible JSON projection. Body content and recipe method variants reuse typed Payload Blocks fields. Finite SQL schemas support two levels of nested section blocks, validated before sync; current articles use one.

The named-field migration is `20260912_115557_named_content_fields`. It only adds tables/columns and leaves existing owner and revision tables intact. Local import updated the existing 20 recipe/article records; the next plan reported all 39 content records unchanged. Direct comparison against the local backup confirmed unchanged owner/authentication tables and preserved recipe/article IDs. The browser check renders a named description, hides legacy JSON, enforces read-only fields, and exposes no Save action (`dist/admin-named-fields.png`). Legacy JSON columns remain for older revision compatibility; current synchronized records use typed values.

D1 modeling lesson: keep the large optional learning/calculator objects in shallow child rows. Flattening every nested field into the recipe exceeded the result-column limit, and splitting every nested object into another row exceeded expression depth. Both failed modeling attempts were replaced before any content write; the accepted migration and sync complete successfully. Empty optional groups must be encoded as empty field objects rather than `null` for Payload's field hooks.

References retain authored public slugs, validated before writes, rather than leaking database relationship IDs into domain models. Dependency order is articles, categories, then recipes. Media references use immutable hashes, with separate public site and per-record maps. Removing source files does not delete records; physical deletion and garbage collection remain deferred.

The source-only snapshot tools and generated fixture adapters remain for Storybook/historical comparison. They are not public runtime fallbacks. Existing `verify:prod` Pages assertions are historical and must be adapted during remote release work.

The local emulator and secret files assume a trusted OS account. Cloudflare Access/MFA, production caching, domains, backups, release locks, rollback sequencing, and public/private CDN delivery belong to the remote phase. A failed application release will not automatically undo content already synchronized.

## Delivery checks (2026-09-12)

The final `pnpm build:worker` passes. Local Wrangler preview on port 3002 returned HTTP 200 for home, recipe, Learn article, admin login, recipe API and sitemap. A real JPEG derivative returned the correct image MIME type, and missing media returned a non-cacheable 404. `pnpm test:images` passes again against the final production build. Logs: `/tmp/eatyeet-final-worker-build.log`, `/tmp/eatyeet-final-worker-preview.log`, `/tmp/eatyeet-final-images.log`.

`pnpm parity` captures all 15 states without browser errors but only 2/15 match the stored baseline (`/tmp/eatyeet-final-parity.log`). Home-fold and mobile-workbench old/current screenshots were inspected: home copy/crop/height and saved-formula/workbench arrangement differ. These have not been accepted as new baselines; full attribution against the pre-migration application and remaining visual/crop review are open. A first run overlapped a build and was discarded; the reported run used stable completed build output.

`pnpm run deploy` exits 1 at the explicit remote-phase guard. No production changes were made. Bare `pnpm deploy` resolves pnpm's built-in command, so use the explicit `run` form. The requested remote-phase handoff is `/Users/phoganuci/.claude/handoffs/2026-09-12-eatyeet-payload-remote-phase.md`.
