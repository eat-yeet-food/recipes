# Remote migration implementation and acceptance

Status: implementation in progress on `codex/payload-remote`, based on `c3497c6f237ea21be62ac7253d131ba9ce6bb16e`. No infrastructure has been provisioned, no staging release has run, and production DNS/application remain untouched. These results are local evidence, not production acceptance.

## Implemented

Locally operated Pulumi infrastructure and release commands, explicit environment selection, Keychain enrollment and encrypted recovery exports, R2 state and conditional release locks, heartbeat/recovery checks, encrypted D1 backups, immutable asset archives, staged content synchronization, maintenance and release journals, resume and compatible application rollback are implemented. Runtime guards enforce trusted hosts and Access JWTs, protect private surfaces, check publication before media delivery, and use generation-keyed R2 content projections. Doppler is absent from the application workflow. See `../../payload-remote.md` for commands and limitations.

The release uses Payload's public `handleEndpoints` dispatcher with the existing authorization/mutation guards. The unused automatic social-image endpoint is omitted and admin OG generation disabled. This removes WASM/font binaries from the Worker bundle; Wrangler's dry-run produces one JavaScript module, 2,627.24 KiB gzip. Pulumi deploys this same complete bundle. Actual Workers runtime verification passed after matching Wrangler's explicit module root and asset-router configuration in the isolated smoke harness.

## Verification on September 12, 2026

- `pnpm test`: passed, including 19 remote tests, infrastructure/application types, boundaries, production build, isolated content/authentication integration, 24 raw HTTP routes, 37 interactions, 134 recipe checks, and 90 Storybook stories at two widths.
- `pnpm test:a11y`: passed, 39 page/state checks with zero failures.
- `pnpm test:images`: passed responsive selection, dimensions, transfer-size and duplicate-download checks.
- `pnpm test:security`: passed; no known vulnerabilities.
- `pnpm build:worker` plus `node test/worker-smoke.mjs`: passed. Exercises actual application routes and Next assets, persistent R2 projections, generation changes, alternate hosts, protected handlers, missing media, maintenance and authenticated verification reads against isolated D1/R2 copies.
- Swift Keychain helper typecheck and `git diff --check`: passed.
- `pnpm parity`: captured all 15 states without page errors; 2 match the older committed baselines. Baselines have not been replaced. See visual review below.
- `pnpm test:lighthouse`: failed only the New York Style Pizza LCP gate. Final three-run medians are below; all routes scored 100 for accessibility and SEO.
- Remote `verify:prod`, MFA/identity tests, isolated remote restore, staging recovery rehearsal and production mobile measurements have not run because remote provisioning/release prerequisites remain incomplete.

Running several Next preview processes concurrently against shared local emulation initially produced intermittent HTTP/image errors. Serial accessibility and image runs passed; a serial parity capture had no page errors. Production acceptance must still exercise isolated remote resources.

| Route | Performance | LCP (ms) | CLS |
| --- | ---: | ---: | ---: |
| `/` | 99 | 2030.826 | 0.003014 |
| `/recipes` | 99 | 1876.689 | 0.000216 |
| `/browse` | 99 | 1953.578 | 0.001246 |
| `/learn` | 99 | 2008.490 | 0.000216 |
| `/recipes/new-york-style-pizza` | 93 | **3074.488** | 0.000768 |
| `/learn/mixing-dough-and-gluten-development` | 98 | 2154.692 | 0.000216 |

Raw measurements are in `dist/performance-after.json`. The pizza trace is in `dist/lighthouse-debug.json`; observed image discovery was immediate, while Lighthouse's mobile simulation reports a later image dependency. Further work must preserve the approved page and formula behavior rather than relax the gate.

## Visual and performance review

Compared all 15 fold/state captures with a fresh build of the immediate pre-migration source `cb74614896e0d1ce5919072cf75127eb877156c3`, retained under `/tmp/eatyeet-before-public`. Also reviewed full-page home, recipe, browse, recipe index and Learn comparisons. Local evidence is in `dist/pre-migration-shots`, `dist/shots`, and `dist/remote-visual-review`.

The older committed baselines predate intentional authored home and pizza changes. The current hero wording, recipe copy, equipment, formula display and page lengths match the immediate pre-migration source. Do not revert those changes or replace baselines merely to satisfy pixel matching. Workbench layout, controls, values, desktop/mobile states and browser formula behavior remain intact. Responsive derivative selection changes image sharpness/compression and therefore image/backdrop pixels.

One unintended migration difference was found and fixed: browse-category fallback selection incorrectly reserved recipe images even when a curated category image was already selected. The European category now uses the same waffles image as the pre-migration source. Full-page layout, ordering and authored content match that source after the correction.

LCP work includes AVIF responsive preloads, first-row browse eager loading with one high-priority image, heading-font WOFF2 subsets, an 800px derivative tier and accurate recipe hero sizes. Browse LCP improved from approximately 3.7 seconds to approximately 1.97 seconds in the prior three-run median. Pizza's image was already discovered immediately and transferred quickly in the unthrottled trace; the mobile simulation still exceeded the gate. Performance acceptance remains open until measured medians pass.

## Authentication and remaining remote prerequisites

Wrangler login succeeded as `phoganuci@gmail.com`. API zone inventory and the Cloudflare dashboard verified account `82d05ba935bb2a21841b0a046d820675` and `eatyeet.com` zone `b1a97ea6be4be417594c189eea4873f5`. Wrangler credentials were migrated to encrypted storage backed by macOS Keychain, and its plaintext credential file was removed by Wrangler's keyring migration.

Sanitized partial inventory is `.local/remote/bootstrap/inventory.json`. OAuth could read the zone, Workers, D1 and Worker routes, but could not read DNS, Pages, R2, Access, organization or subscriptions. Unreadable collections are explicitly recorded as unavailable; empty arrays must not be interpreted as proof that resources are absent. The dashboard showed the zone's Free plan, which does not establish all account product limits.

Still required: scoped bootstrap/staging/production API and R2 credentials, separately protected recovery exports, complete inventory including legacy Pages/hooks/DNS and limits, verified Access organization and exact owner allowlist, live MFA enrollment/review, committed verified infrastructure settings, a clean immutable release commit, staging release/recovery/performance acceptance, legacy deployment freeze, and production cutover/verification. No account/resource identifiers may be invented to bypass these prerequisites.

A metadata-only Keychain lookup confirmed that `com.eatyeet.release` entries for `bootstrap`, `staging`, and `production` are absent (status 44). No secret values were read or displayed by that check. The user was asked about enrollment; credentials must be entered in the local interactive command, never in chat.

The operator guide documents conservative recovery limitations: lost-host writer recovery requires credential revocation and operation review; application rollback preserves migrations/content; older exports require verified isolated restoration before database replacement. The exact live legacy route rollback must be finalized from full inventory before cutover.
