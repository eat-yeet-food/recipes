# Cloudflare operations

This is the operator entry point for Eat / Yeet. [The implementation reference](payload-remote.md) explains the release protocol and recovery details. [Release evidence](changes/payload-remote/review.md) records observations and unresolved findings; historical entries are not current status. Read live release status before acting.

Required post-cutover work: [address the page/image loading regression](changes/payload-remote/performance-regression.md). The owner requires this work; a deployment exception does not resolve the performance issue.

## Daily deployment

Work from `/Users/phoganuci/src/recipes`. Commit and push the intended changes, then use the explicit environment commands. No deployment occurs on Git push. Local development never uses remote bindings.

```sh
git status --short --branch
pnpm run deploy --env staging
pnpm release:status --env staging
pnpm remote:rehearse --env staging
pnpm remote:acceptance --env staging --owner-reviewed
pnpm run deploy --env production
pnpm release:status --env production
pnpm verify:prod https://eatyeet.com
node test/remote-performance.mjs https://eatyeet.com
```

Only use `--owner-reviewed` after the identity/admin review described below. Acceptance belongs to the exact commit deployed to staging. A documentation or tooling commit also changes the SHA: finish the candidate before staging acceptance, and record post-release evidence in a later commit without misidentifying the deployed application.

If acceptance/recovery tooling itself needed a fix, `remote:acceptance --env staging --application-revision <full-deployed-SHA>` can verify the existing application without redeploying it. It checks the actual downloaded Worker source against the archived release, matching release/content identities and unchanged migrations, then runs normal acceptance. Evidence records the application SHA and verifier-tooling SHA separately. Production must still deploy the accepted application commit; this option does not mark the new tooling commit as a tested application.

Normal releases need no credential enrollment, password copying, API-token changes, dashboard deployment, or manual maintenance toggle. The CLI loads Keychain credentials, builds immutable assets, takes the shared remote lock and backups, publishes through Pulumi, verifies, and reopens traffic. Cloudflare may open normal Chrome when the owner Access session expires. `cloudflared` captures its token privately; do not run verbose login commands that print tokens.

For a code-only iteration against an existing healthy environment, use:

```sh
pnpm run deploy --env staging --code-only
# After exact-commit staging acceptance:
pnpm run deploy --env production --code-only
```

This mode still requires a clean committed checkout, the shared lock, a fresh remote content plan, backups, an immutable asset manifest, Pulumi and Worker/browser verification. It rejects migration differences or any planned recipe/article/site/media changes before maintenance. It verifies existing derivative sizes, SHA-256 metadata and MIME types with up to eight concurrent reads, skips media uploads and skips migrations/content synchronization. Missing or mismatched media requires a full release. A brief drain/verification maintenance window remains; no untracked hot patch or direct Wrangler deployment is introduced. The journal records `mode: code-only`; resume retains that mode and rechecks actual content/media state. It cannot provision a new environment or recover an unrelated maintenance release. Production acceptance and its exact-commit limitations policy are unchanged.

After a restart, ensure normal Chrome is running before refreshing Access. If a login stalls without a browser window, stop only that identified read-only login process and retry `.local/remote/bin/cloudflared access login --quiet https://staging.eatyeet.com`; `--quiet` suppresses JWT output. The browser may only need approval of the existing application's CLI session, reusing current MFA proof. Verify the resulting session before starting a release. This is not credential reenrollment or permission to change Access policies.

## Verified account and resource map

Inventory checked 2026-09-13. Names are descriptive; compare actual IDs against inventory before adopting or changing resources.

| Resource | Verified identity / role |
| --- | --- |
| Cloudflare account | `82d05ba935bb2a21841b0a046d820675` |
| `eatyeet.com` zone | `b1a97ea6be4be417594c189eea4873f5` |
| Owner allowlist | `phoganuci@gmail.com`, account membership required |
| Access team | `icy-fog-1d6c.cloudflareaccess.com` |
| Cloudflare identity provider | `3d5badd9-1c03-4f76-9622-73ca031d9610` |
| State bucket | Private `eatyeet-pulumi-state`, protected bootstrap stack |
| Staging | `https://staging.eatyeet.com`, Worker `eatyeet-staging` |
| Staging D1 | `b9eb5162-91d3-4461-bbba-46bf5d4997f6`, `eatyeet-staging-content` |
| Staging R2 | `eatyeet-staging-media`, `eatyeet-staging-cache`, `eatyeet-staging-operations` |
| Production | `https://eatyeet.com`; admin `/admin`; derivative origin `https://media.eatyeet.com` |
| Production Worker | `eatyeet-production` |
| Production apex route | `8296ee010a124ae9b2b0643658906d5c`, `eatyeet.com/*` → `eatyeet-production` |
| Production D1 | `9a657ae9-d9b2-4bf4-ae3a-ac405b31cf5a`, `eatyeet-production-content` |
| Production R2 | `eatyeet-production-media`, `eatyeet-production-cache`, `eatyeet-production-operations` |
| Retained Pages project | `eatyeet`, ID `e835ec8d-674f-4b10-84a3-fe0c931beb5a` |
| Retained Pages deployment | `f7974d5e-22bd-44fe-9ee3-cf90daa9b734`, `https://f7974d5e.eatyeet.pages.dev`, commit `cb74614896e0d1ce5919072cf75127eb877156c3` |
| Legacy DNS | Apex and `www` proxied CNAMEs to `eatyeet.pages.dev` |

The bootstrap stack owns the state bucket, Access organization, account-restricted identity provider and owner MFA enrollment launcher. Each application stack owns its D1 database, three private R2 buckets, Worker, bindings, Access apps/policies, and delivery routes. There is no shared application database, Payload secret or owner session between staging and production.

Production cutover completed on 2026-09-13 with application `8df398195b929e9503e4f74ae2e98feb5bf700b6`, release `8df398195b92-1789307349954`. Verification tooling `99d6948` reopened traffic after fixing a canonical-URL comparison in the verifier; no application redeployment was needed. The release was ready with its lock cleared. Production mobile performance failed its LCP budgets; the required optimization work remains open. Payload owner bootstrap/manual review remains pending and must not be inferred from successful Access sign-in.

Production cutover added the apex Worker route `eatyeet.com/*` and media custom domain. It retains Pages and its DNS target for route rollback. `www` behavior remains part of the inventoried legacy configuration until deliberately migrated; do not assume an apex route also matches `www`.

The Worker checks configured hosts, Access tokens where required, current maintenance state and publication eligibility. Public content projections use OpenNext R2 caching by environment/schema/content generation. The deployed application below still renders HTML dynamically; the separately implemented anonymous HTML cache is described below. Originals have no public delivery route. Derivatives remain privately stored and eligibility-checked before cache delivery; browser bytes already downloaded cannot be recalled.

Production application `1729bc3701d6903b641f2809bcba5b3e82ab562c` was released on 2026-09-13 as `1729bc3701d6-1789335454057`, generation `fe95dc70-1d2c-41ca-8f2f-86836ae58968`. It is ready with its lock cleared. It gives hashed Next build files a one-year immutable browser lifetime and named fonts/favicon one day with revalidation. These files contain no content/session state and skip the operations-bucket read, including during maintenance; trusted-host and staging Access checks remain. Staging uses private browser caching. Pages, APIs, private images and errors stay no-store; published derivatives retain one year without immutable. Worker/browser verification passed, including actual repeat asset transfers. Cold mobile performance remains below target; see the performance note for measurements and the explicit deployment exception.

## Anonymous HTML cache

On 2026-09-13 the owner requested anonymous public HTML caching after the release above. The follow-up implementation uses a one-day Worker Cache API entry for complete public HTML, capped at 1MiB, keyed by schema/environment/release/content generation/path. It is not yet deployed. Every hit still reads current release state first. Maintenance closes traffic immediately; synchronization, retirement, restore and application rollback advance the generation so previous HTML cannot be reused. Old objects expire naturally; no separate zone-wide HTML purge is required.

Only production anonymous document GETs on known public routes are eligible. Any cookie or authorization/Access identity, query string, RSC/Next/prefetch header, conditional/reload/range request, preview/API path or maintenance probe bypasses caching. Cache fills use fixed public headers, so forwarding headers, user agents and locales cannot poison another visitor's page. Only complete successful HTML is retained; cookies, errors, unexpected Vary fields, streamed render failures and oversized documents are excluded. Cache failures fall back to normal rendering. Browser responses remain `private, no-store`; only the internal edge copy has a one-day lifetime. `X-Eatyeet-HTML-Cache` reports HIT/MISS/BYPASS on HTML responses.

The same candidate scopes Payload's color-scheme client-hint headers to `/admin/:path*`. Its default all-route `Critical-CH` causes an extra first navigation in Chromium, while the public site has no server-rendered theme variants. Admin theme negotiation and public security headers remain intact.

Staging's owner Access session bypasses anonymous HTML caching. The isolated production Worker smoke tests actual edge hits, hydration/navigation and maintenance/generation behavior. After the HTML-cache candidate is accepted, deployed and reopened, verify real anonymous production with:

```sh
EATYEET_EXPECT_HTML_CACHE=1 pnpm verify:prod https://eatyeet.com
node test/remote-performance.mjs https://eatyeet.com
```

Do not run that cache-hit assertion during maintenance or with an owner/verification token: those requests intentionally bypass it. [Cloudflare Cache API entries are local to the serving data center and may be evicted](https://developers.cloudflare.com/workers/runtime-apis/cache/); a hit in one location does not imply a globally warm site. Keep mobile results separate from raw response timing, and do not claim the loading regression resolved from a cache hit alone.

## One-time setup and recovery enrollment

Pinned tools: Pulumi CLI `3.230.0`, Cloudflare provider `6.20.0`, `cloudflared` `2026.9.1`. Node/pnpm and application dependencies follow the lockfile and package manifest. The local cloudflared binary is `.local/remote/bin/cloudflared`; its official archive digest and installation provenance are in the implementation reference.

The shared operator token is restricted to the account and zone above:

| Scope | Permissions |
| --- | --- |
| Account, Edit | Workers Scripts; Workers R2 Storage; D1; Access: Apps and Policies; Access: Organizations; Access: Identity Providers; Cloudflare Pages |
| Account, Read | Account Settings; Billing |
| Zone, Edit | DNS; Workers Routes |
| Zone, Read | Zone |

On 2026-09-13 the owner authorized the three outstanding Read→Edit upgrades (Organizations, Identity Providers, Pages), and Cloudflare saved them on the existing **Eat Yeet staging** token. The token's name does not determine its deployment authority. `operator` enrollment adopts that token without rotating or displaying it.

```sh
pnpm remote:setup --from staging
```

On a new Mac without a legacy token entry, run `pnpm remote:setup` and enter the operator token once. Setup derives R2 credentials, preserves existing environment secrets, generates missing secrets, and asks for a separate recovery passphrase twice. The owner requested a minimum of 9 characters. Never paste tokens, owner passwords or recovery passphrases into chat, command arguments or Git.

Keychain service `com.eatyeet.release` holds `operator`, `bootstrap`, `staging`, and `production` entries. `operator` supplies Cloudflare/R2 authority; the environment entries retain separate Pulumi passphrases and runtime secrets. The recovery export must cover all entries before remote operations resume. An interrupted setup preserves generated values; rerun setup to finish the export, not enrollment/rotation from scratch.

The encrypted kit is `.local/remote/recovery/operator-<timestamp>.json`. Copy it to separately secured offline storage; store its passphrase separately. Restore with:

This installation completed unified recovery enrollment on 2026-09-13, with kit `.local/remote/recovery/operator-1789305580747.json`. All environment entries match that completed export. The protected bootstrap update and initial production provisioning completed successfully; production was provisioned with cutover disabled before this candidate enabled it. The retained Pages homepage and four referenced CSS/JS assets returned 200 before cutover.

```sh
pnpm remote:setup --restore /path/to/operator-recovery.json
```

Setup runs protected bootstrap after enrollment. No Doppler, GitHub CI secrets, global API key or API-token-management permission is needed. Wrangler OAuth and Cloudflare Access browser sessions are separate credentials from the deployment operator.

Pulumi state uses R2's S3 endpoint with explicit `region=auto`, `awssdk=v2` and passphrase encryption. Keep the passphrase stable. The bootstrap stack protects the bucket; checkpoint history is retained. Timestamped state backups and encrypted database exports expire after 30 days. That retention does not extend D1's account-specific Time Travel window.

## First production cutover

1. Enroll and export recovery credentials. Refresh `pnpm remote:inventory --env bootstrap`; verify account/zone, plans, DNS, Pages, hooks and existing resources. Save a timestamped copy of the sanitized inventory.
2. Provision production with `infra/cloudflare/production.json` `cutover: false`: `pnpm remote:infra preview --env production`, then `pnpm remote:infra up --env production`. Initial Worker returns 503 and no apex route is created.
3. Set `cutover: true`, finish documentation/tooling changes, run applicable repository checks, commit and push the candidate. Deploy that exact SHA to staging.
4. Run staging restore rehearsal and acceptance. Bootstrap/review its separate owner as described below, or record an explicitly authorized pending-review exception. Do not fabricate an owner-review attestation.
5. Run `pnpm run deploy --env production`. The release saves cutover inventory, rejects outstanding legacy deploy hooks, disables matching Pages Git production builds if present, and publishes the Worker route only after compatible schema/content preparation.
6. Verify raw HTML, referenced Next assets, hydration/navigation, images, protected/public cache behavior and release identity. Measure production mobile performance separately. Record actual production resource/route IDs and the Pages deployment used for rollback.

Initial provisioning does not need the final cutover commit. All content releases require a clean immutable commit. Never change `cutover` in an uncommitted checkout just to get a release past this sequence.

## Owner authentication and acceptance

Cloudflare Access protects all staging requests and production admin/API/preview surfaces; `/api/public` remains public. The account-restricted Cloudflare sign-in provider, exact owner email, independent MFA, disabled default/preview Worker hostnames, and in-handler JWT checks remain enforced even when a review is pending.

Use normal Chrome for authentication. Enroll an independent authenticator at `https://icy-fog-1d6c.cloudflareaccess.com/#/Account`. If a Touch ID choice opens a phone QR but the phone has no passkey, cancel that challenge and select an enrolled method in normal Chrome. Do not disable MFA or reset devices merely to finish a deployment. The owner-only App Launcher permits first-device enrollment without requiring that new device in advance; site apps retain MFA.

After a database is initialized, run `pnpm owner:bootstrap --env staging` or `--env production` in an interactive terminal. Enter a distinct owner password. Never copy the development database/owner. `owner:recover` is explicit password/session recovery and revokes existing sessions; it is not a routine deployment step.

Owner review includes allowed identity/MFA, denied identity/account, Payload login and read-only admin, denied writes, preview/draft handling, expired/forged JWTs, session revocation, alternate-hostname protection and environment session isolation. Automated Worker checks cover only part of this list. An empty owners table means Payload admin cannot be used until bootstrap; it does not enable signup.

### Explicitly authorized limitations

Default acceptance requires performance ≥90, LCP ≤2.5 seconds and CLS ≤0.1 using three mobile runs per route, plus completed owner review. If the owner explicitly directs deployment despite disclosed performance shortfalls or deferred manual owner review, record that authorization with:

```sh
pnpm remote:acceptance --env staging --approved-limitations 'Record the owner request, date, and the specific disclosed limitations here.'
```

This is an exceptional, audited path, never the default. It still executes exact-commit staging Worker/security checks, all performance measurements, encrypted-export restore and the D1 recovery rehearsal. Actual failing metrics and `ownerReviewed: false` remain in evidence. Exceptions are bound to the owner and commit, expire after 24 hours, and are copied into the production release journal. They cannot waive restore, failed Worker/security verification, missing credentials, locks or MFA enforcement. A new commit needs new acceptance and authorization; a prior exception is not blanket approval for future releases.

## Failure recovery and rollback

First run `pnpm release:status --env <environment>`. `ready` plus a cleared lock indicates a completed release. A browser sign-in page is Access; “We’re updating the site” is application maintenance. Signing in alone does not clear maintenance. Inspect the journal phase before selecting recovery.

All mutations use a conditional R2 ownership lock and Pulumi locking. A stale heartbeat means interrupted work, not permission to steal ownership. Verify the process, its child writers and outstanding remote operations are stopped; the local recovery tool additionally checks host, dead PID and a two-minute quiet interval.

```sh
pnpm release:recover <release-id> --env staging --writer-stopped
pnpm run deploy --env staging --resume <release-id>
```

Resume uses the original commit and backup. If the application is already deployed and only its verification failed, use `pnpm release:verify <release-id> --env staging` after ownership recovery. It validates deployed source and migrations, runs Worker checks, and reopens on success. Verification tooling may have a different clean SHA; the application SHA remains unchanged and both are recorded.

For failed initial provisioning, use `pnpm remote:infra up --env <environment> --resume infra-<timestamp>` after recovery. Do not use initial provisioning against a content-initialized stack. If code must change to fix a failed release, preserve the former journal, recover its writer, commit the fix and start a new compatible release. Never rewrite the failed release's SHA.

For a failed restore rehearsal that already created its probe, recover the stopped writer, then run `pnpm remote:rehearse --env staging --backup backups/time-travel-<original-timestamp>/database.json`. Use the original encrypted pre-probe backup, not the subsequent safety snapshot. Resume requires maintenance, validates the export and matching content/owner identities, saves another safety backup, restores the exact bookmark and verifies probe removal before reopening. D1's restore bookmark is a [query parameter](https://developers.cloudflare.com/api/resources/d1/subresources/database/subresources/time_travel/methods/restore/); a JSON-body bookmark is ignored and returns error 7400. Rehearsal evidence records the recovery-tooling SHA separately from the unchanged deployed application SHA.

Application rollback is `pnpm run deploy --env production --rollback <completed-release-id>`. It requires compatible migrations, restores retained bundle/assets, preserves current content/authentication data, advances cache generation and verifies. Database restore is a separate maintenance operation using the exact backup bookmark; see the implementation reference.

For emergency return to retained Pages, first stop/recover the release writer. Save state and recheck production route `8296ee010a124ae9b2b0643658906d5c` (`eatyeet.com/*`) against live inventory. Through Pulumi, remove only `eatyeet.com/*` (deliberately disable that route's deletion protection/retention), keeping Pages, DNS, D1, R2 and Access intact. Verify Pages HTML and its referenced assets. Reconcile `cutover` and route ownership in Git/Pulumi before another release. Do not delete the zone, replace DNS with a guessed target, or reenable legacy automatic deployments before verifying the rollback.

## Troubleshooting without repeated setup

| Symptom | Next action |
| --- | --- |
| Keychain locked | Unlock the existing Keychain; do not reenroll or rotate secrets |
| Recovery pair incomplete | Finish `remote:setup`; preserve existing generated entries |
| Access login in the wrong browser | Use normal Chrome and the pinned cloudflared flow; avoid separate testing-browser MFA enrollment |
| Maintenance after failed release | Inspect phase/lock; recover stopped writer and resume/verify |
| Pulumi asset manifest unknown | Keep provider 6.20.0 directory-based assets with the checked SHA-256 manifest |
| Worker source hash differs | Verification accepts exact raw bytes or exact provider NFC normalization only; investigate every other difference |
| Repeated import/replacement preview | Check adopted resource state; do not keep passing imports for already-adopted resources |
| GitHub SSH port 22 blocked | Use SSH via `ssh.github.com:443`, preserving repository and host verification |
| Explicit environment missing | Add `--env staging` or `--env production`; never change local defaults |

Deploy credentials travel only through child environments/Keychain pipes. Keep `.local`, generated bundles, recovery exports and reports out of commits. Structured Worker errors include release identity; correlate them with the operations journal and state backups before retrying a mutation.
