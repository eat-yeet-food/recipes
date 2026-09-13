# Remote migration implementation and acceptance

Status: staging is deployed and ready for owner review on `codex/payload-remote`. Release `3f3da9b25244-1789298041660` serves application/content commit `3f3da9b25244b7623c6a4232ab122bc233c7cff6`; verification tooling commit `cef2378` completed recovery. All 78 live Worker/browser checks passed, maintenance is off, and the R2 release lock is cleared. Fresh authenticated homepage and pizza requests without the maintenance-verification token returned 200 and real content. Regular Chrome displayed the Pollo Asado recipe. Production DNS/application remain untouched. Full staging acceptance (including performance, owner/session review and restore rehearsal) remains separate from this successful release verification.

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

### Credential enrollment follow-up

The owner subsequently created the reviewed `Eat Yeet bootstrap` token, enrolled it through the local hidden terminal prompt, and exported `.local/remote/bootstrap/recovery.json`. The encrypted export exists with mode 0600 and its completion timestamp is registered in the bootstrap Keychain entry. No token or recovery passphrase was printed. The owner requested a 9-character recovery minimum; this is implemented and boundary-tested. The independently generated Pulumi passphrase retains its original entropy.

Enrollment now supports `--derive-r2`: it verifies an active user API token and derives its S3 access ID/secret using Cloudflare's documented token ID and SHA-256 mapping. R2 permissions are still required. Credential/recovery and remote release tests pass (22 tests). Staging and production credentials have not yet been enrolled.

Authenticated inventory exposed a pagination bug, not a Pages permission failure: the API rejected `per_page=50` and `25`, but accepted `10` and returned its default size as 10. The common inventory page size is now 10. The existing Pages project is `eatyeet` (`e835ec8d-674f-4b10-84a3-fe0c931beb5a`), with `eatyeet.com`, `www.eatyeet.com`, and `eatyeet.pages.dev`, production branch `main`, no Git source configuration, and no deploy hooks. Both public DNS names are proxied CNAMEs to `eatyeet.pages.dev`. No DNS or Pages settings have been changed.

The remaining API errors are account activation prerequisites: R2 returns 10042, "Please enable R2 through the Cloudflare Dashboard"; Access returns 9999 with `access.api.error.not_enabled`. Thus the enrolled token is valid, but these products have not been enabled. R2 checkout displays $0 due now, 10 GB-month storage, 1 million Class A and 10 million Class B operations included monthly, then usage charges. Zero Trust Free is being prepared; accepting subscription terms requires owner confirmation before activation. No subscription has been activated by the agent.

The operator guide documents conservative recovery limitations: lost-host writer recovery requires credential revocation and operation review; application rollback preserves migrations/content; older exports require verified isolated restoration before database replacement. The exact live legacy route rollback must be finalized from full inventory before cutover.


### Activated account and bootstrap verification

The owner completed R2 and Zero Trust Free activation. Full API inventory at `2026-09-13T03:03:04.937Z` has no unavailable collections. The verified Access domain is `icy-fog-1d6c.cloudflareaccess.com`; the existing Cloudflare identity provider is `3d5badd9-1c03-4f76-9622-73ca031d9610` and already restricts authentication to account members. Non-secret environment settings use these inventoried identifiers and retain `cutover: false`.

The approved bootstrap created `eatyeet-pulumi-state`. Two attempts stopped before any Pulumi stack or infrastructure update because the pinned CLI embeds Go CDK 0.37, whose SDK v2 backend does not accept either path-style query option. The backend now uses an explicitly HTTPS account endpoint, region `auto`, and SDK v2 without unsupported options. Each stopped writer was checked for remaining child processes and remote state, then recovered through the normal lock command after the two-minute quiet interval. No forced lock deletion was used. Source: [Go CDK 0.37 SDK v2 configuration](https://github.com/google/go-cloud/blob/v0.37.0/aws/aws.go).

The 22 remote tests and infrastructure TypeScript check pass. Staging and production Keychain entries remain absent; no environment release or production verification has run.

Bootstrap subsequently completed successfully. The pinned provider requires identity-provider import IDs to start with `accounts/`; the program now uses that format. The final preview imported all three existing resources, then applied MFA configuration, the sign-in display name, disabled R2 public delivery and backup lifecycle. API and encrypted state inspection verified five protected/retained Cloudflare resources, the state bucket's public domain disabled, a 30-day `backups/` lifecycle, retained Pulumi state/history, two timestamped pre-update state backups, and no remaining release lock. No site Worker, database, staging hostname or production route has been created. Live owner MFA review remains outstanding.

### Staging credentials and initial provisioning

Staging Keychain enrollment and its mode-0600 encrypted recovery export are verified. Full inventory passed with the separate staging token. The staging preview exposed the provider's required `security_key` spelling in application MFA settings; this is corrected. The initial update created D1, three private buckets, retention settings and owner Access resources, but rejected the Worker upload with code 10021 because its multipart metadata was empty. A loopback-only provider probe using dummy credentials isolated the issue to `placement: { mode: 'smart' }`; basic bindings and observability encode correctly. The optional placement setting was removed while preserving logging.

The failed writer and Pulumi locks were checked, the remote Worker was confirmed absent, and normal lock recovery completed after the quiet interval. Initial provisioning now supports explicit `--resume infra-<timestamp>`, guarded by the original empty-stack backup and absence of a content release/initialized Worker. Two additional tests cover allowed partial provisioning and rejection of unsafe reuse. All 24 remote tests and infrastructure TypeScript checks pass.

Resuming `infra-1789270003115` succeeded with three resources created and twelve unchanged. Staging uses Worker `eatyeet-staging`, D1 `b9eb5162-91d3-4461-bbba-46bf5d4997f6`, and its isolated media/cache/operations buckets. It is still the uninitialized 503 application behind owner Access; no content release or owner MFA acceptance is claimed. Production remains on Pages.

### First staging release and MFA enrollment dependency (September 13)

Release `2fae926b12fd-1789270433930` initially stopped at remote binding startup because the account had no Workers subdomain. Opening the account's Workers & Pages overview initialized `phoganuci.workers.dev`; API checks confirmed staging's default and preview hostnames remain disabled. After verifying the former writer and children had stopped, the original lock was recovered and the same immutable commit resumed.

The resumed release reused the existing backups and uploads, applied all migrations, synchronized 39 content records and site/media data, and passed the subsequent no-op content plan. The application upload reached Cloudflare, but Pulumi 6.20.0 failed recording its result with `unexpected unknown property value for "assetManifestSha256"`. A sanitized Worker settings read confirms the live `RELEASE_ID` is `2fae926b12fd-1789270433930`; Pulumi outputs still report `uninitialized`. The release is failed at `application`, its lock is retained, and maintenance remains active. Do not declare it healthy, discard its original backup, or reopen traffic before reconciling provider state and running verification. Local evidence: `.local/remote/staging/deploy-resume.log` and `.local/remote/provider-probe/assets-results.log`.

The asset error reproduces against a loopback-only fake API with dummy credentials. Explicitly supplying the computed hash is rejected as read-only; supplying both an uploaded JWT and directory is rejected as mutually exclusive. Older providers 6.9.0, 6.8.0 and 6.5.0 also fail their Worker-first routing conversion. No provider downgrade or workaround has been applied. The package registry still reports 6.20.0 as current.

Cloudflare's independent MFA enrollment requires the App Launcher, which was absent. The bootstrap program now declares an owner-only launcher and policy, preserving exact email, Cloudflare identity provider and account membership requirements. The launcher omits independent MFA to allow first-device enrollment; application MFA remains required. Existing resource imports are now omitted after their identities are present in the stack, preventing repeated import replacements. The final live preview shows exactly two creates and seven unchanged resources. It has not been applied: the bootstrap token needs Access Apps and Policies Edit, and the Mac was locked before its dashboard permission update. Never copy a staging or production credential into the bootstrap Keychain entry.

Infrastructure TypeScript and all 24 remote tests pass. Owner MFA enrollment, post-deploy Worker verification, restore rehearsal and performance acceptance remain incomplete. Production credentials, production deployment and cutover remain pending; Pages is unchanged. This fix is prepared in an isolated worktree so the active checkout can still resume the original release SHA once its provider issue is resolved.

### Operator setup simplification

The owner explicitly requested the simpler AWS-style workflow: enroll one operator credential and let Pulumi handle infrastructure. The new `pnpm remote:setup` flow adopts an existing token with `--from staging` or accepts one token interactively, derives R2 credentials, preserves existing environment secrets, generates missing secrets, writes one authenticated encrypted recovery kit, and runs Pulumi bootstrap. Normal `deploy --env staging|production` provisions a missing environment. A shared operator token supplies deployment authority; runtime data, encryption passphrases, Payload secrets and sessions remain isolated. No GitHub automation, token-management permissions, automatic lock stealing, or automatic token revocation was introduced.

Recovery can restore all environment entries with `remote:setup --restore <kit>`. Interrupted enrollment retains previously generated secrets, and commands refuse an operator/environment pair not covered by the completed export. The operator migration has not been activated against Keychain yet; the existing staging token still needs the complete account permission set documented in `docs/payload-remote.md`.

The MFA portal is now applied successfully. The first attempt failed with 403 because `Access: Apps: Edit` excludes reusable policies; the owner then explicitly approved and saved `Access: Apps and Policies: Edit` on the bootstrap token. The stopped attempt's lock was recovered after checking the writer, policy inventory and Pulumi locks. The successful update created policy `44513412-dc58-4ca5-9c14-a9c9587d264d` and launcher `d35030d4-4657-49b5-9495-259c623fc213`, retained seven existing resources and released the bootstrap lock. API reads confirm exact owner email, account membership and the configured Cloudflare IdP. The browser reached Account > MFA Devices as the correct owner; personal authenticator enrollment remains unverified. Cloudflare fixes this application name to `App Launcher`, which the program now preserves.

All 28 remote tests, the full TypeScript project build, infrastructure TypeScript, the 21-owner package boundary check and Swift helper typecheck pass. Public application code and dependency versions were not changed. The existing Worker provider error still blocks release completion and post-deployment verification; production remains unchanged.
# Staging provider recovery — September 13

Remote browser verification follow-up: visibility checks now exclude zero-size/offscreen images rather than reading empty `currentSrc` from hidden responsive elements. Actual staging derivatives returned 200, image/avif, ETag and valid decoded image bodies, while the OpenNext/Cloudflare streaming response omitted Content-Length. The verifier now records delivered body bytes and verifies a declared length when present, instead of rejecting valid streamed responses. These are verification-tool changes; staging application/content remain at `3f3da9b25244b7623c6a4232ab122bc233c7cff6`.

Verification parser follow-up: Cloudflare returns the main module as a multipart text field without a filename. The provider's Terraform/cty string transport also NFC-normalized two Bengali date-locale regex lines: the raw bundle hash is `027be58f5a5f681130aa3b2abf0f8d8bbd8f8d2b68e5087b36aa11d72184b217`; the deployed source exactly equals NFC(original), hash `98a19af331d0321595c22100c43a2d2b3761bb962e2413a6e116d8bbd3775582`. Recovery verifies the original archive checksum and permits only raw bytes or that exact NFC transformation, recording the deployed checksum/normalization separately. Other byte changes remain failures. See [cty StringVal normalization](https://pkg.go.dev/github.com/zclconf/go-cty/cty#StringVal). Browser verification now seeds the context's cookie jar, because Playwright ignores Cookie overrides in route.continue.

The directory fix was deployed successfully as `3f3da9b25244-1789298041660`; Pulumi recorded the application update and all 39 synchronized content records remained unchanged. Verification then timed out waiting for an isolated testing-browser login. Replaced that login with the official pinned Cloudflare CLI's normal-browser flow; the owner's existing browser sign-in successfully supplied an app session without another login. Added verification-only recovery with source-hash and content/migration identity checks, conditional maintenance reopening, archived recovery evidence, and explicit verifier revision recording. Remote tests cover successful reopening, wrong phases/identities, competing releases, changed generations, failed health checks and credential-safe login errors. Live health verification remains the final gate.

The earlier staging application upload completed remotely but provider 6.20.0 failed to record `assets.assetManifestSha256` for JWT-only input. A local fake Cloudflare API reproduces that failure. Using an asset directory passes both creation and an update after changing an asset with the same pinned provider. The release now supplies a checked directory plus SHA-256 snapshot, preserves existing upload/archive codecs, and rejects extra/changed/missing files, source maps and symlinks before infrastructure publication.

Validation: 24 remote operation tests pass, including recovery into a new compatible commit after explicit writer recovery; infrastructure TypeScript, project TypeScript and all 21 package/app boundaries pass. The fake-provider create/update probe is local evidence, not staging acceptance. Live deployment and Worker verification are still required. The previous local pizza LCP failure and owner/recovery acceptance requirements remain open.
