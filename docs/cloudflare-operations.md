# Cloudflare operations

This is the operator entry point for Eat / Yeet. [The implementation reference](payload-remote.md) explains the release protocol and recovery details. [Release evidence](changes/payload-remote/review.md) records observations and unresolved findings; historical entries are not current status. Read live release status before acting.

Required post-cutover work: [address the page/image loading regression](changes/payload-remote/performance-regression.md). The owner requires this work; a deployment exception does not resolve the performance issue.

## Daily deployment

From the intended clean commit in `/Users/phoganuci/src/recipes`:

```sh
pnpm run deploy --env both
```

This preflights staging and production credentials immediately, authenticates staging in the normal browser if needed, deploys staging, then deploys production using the same verified build. A failed staging deploy stops the sequence. Production's public apex does not need an Access login. Git push alone does not deploy. To target one environment, use `--env staging` or `--env production`.

There is no deployment maintenance window, drain timer, manual acceptance, performance waiver, restore rehearsal, or second verification command. The CLI performs a short health check of the deployed identity, homepage, recipe, JavaScript assets, ratings API and anonymous owner-API protection. Full browser audits, performance measurements, SQL exports and recovery drills are separate operator tasks.

The release automatically detects content/schema changes. Unchanged data skips migrations, sync and database backup work. Data changes record a Time Travel bookmark; SQL export is excluded because Cloudflare blocks database requests during export. Content writes are atomic per Payload operation, so readers see a complete recipe before or after the update. Live ratings/replies and authentication data are never replayed from a snapshot. Content may become visible before the new Worker; migrations and new content features must support both versions during rollout. Cache generations change around synchronization.

Media and rollback archives use SHA-256/size/MIME checks with bounded parallel requests and upload only missing or changed objects. Existing local archived assets are reused after checksum verification. Pulumi alone uploads Worker static assets using Cloudflare's missing-hash negotiation; the former duplicate upload session is removed. Identical commits reuse a verified local build across environments. The journal records phase timings and uploaded/reused media counts; measure these rather than guessing where time went.

`--code-only` remains an optional assertion that content and migrations are unchanged. It is no longer necessary to get the fast path. Application rollback restores archived bundle/assets without rebuilding or reversing shared data:

```sh
pnpm run deploy --env production --rollback <completed-release-id>
```

New migrations must declare `export const onlineCompatible = true` after compatibility review. Add nullable/defaulted fields and introduce replacements before retiring old fields in a later change. A rolling Worker deploy cannot make an incompatible shared-database migration safe. Destructive migrations are rejected before mutation; explicit database recovery is a separate operation.

Cloudflare supports [versioned and gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/). This workflow uses normal Worker replacement with traffic kept open, not a percentage canary. Old static chunks are retained for open browser tabs. A failed health check attempts to restore and verify the prior application automatically, preserving all live data. Successful rollback clears the lock but still reports the candidate as failed. Failures before database mutation/Worker deployment clear the lock so they can be retried directly. Otherwise inspect the retained journal/lock before recovery.

After a restart, use normal Chrome for Access. If a login stalls, stop only the identified read-only login and retry `.local/remote/bin/cloudflared access login --quiet https://staging.eatyeet.com`; `--quiet` suppresses JWT output. Do not reenroll credentials or change Access policies for a routine deploy.

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

On 2026-09-13 the owner requested anonymous public HTML caching after the release above. Application `d03ad5725571be3459776213d4b3cc4510438d00` is now production release `d03ad5725571-1789339001713`, generation `438f330c-7f1e-4cca-ab6d-d73bd5fabd2a`, ready with no lock. Staging runs the same application as `d03ad5725571-1789337824164`. The owner explicitly approved this candidate's measured performance and pending manual-owner-review limitations; exact-commit acceptance, actual restore and Worker/security checks completed. Production verification confirmed anonymous homepage/recipe HTML hits and session/reload bypass. Cold mobile LCP remains 3.42–3.94 seconds, above budget; the loading work remains open.

The cache uses a one-day Worker Cache API entry for complete public HTML, capped at 1MiB, keyed by schema/environment/release/content generation/path. Every hit still reads current release state first. Maintenance closes traffic immediately; synchronization, retirement, restore and application rollback advance the generation so previous HTML cannot be reused. Old objects expire naturally; no separate zone-wide HTML purge is required.

Only production anonymous document GETs on known public routes are eligible. Any cookie or authorization/Access identity, query string, RSC/Next/prefetch header, conditional/reload/range request, preview/API path or maintenance probe bypasses caching. Cache fills use fixed public headers, so forwarding headers, user agents and locales cannot poison another visitor's page. Only complete successful HTML is retained; cookies, errors, unexpected Vary fields, streamed render failures and oversized documents are excluded. Cache failures fall back to normal rendering. Browser responses remain `private, no-store`; only the internal edge copy has a one-day lifetime. `X-Eatyeet-HTML-Cache` reports HIT/MISS/BYPASS on HTML responses.

The same candidate scopes Payload's color-scheme client-hint headers to `/admin/:path*`. Its default all-route `Critical-CH` causes an extra first navigation in Chromium, while the public site has no server-rendered theme variants. Admin theme negotiation and public security headers remain intact.

Staging's owner Access session bypasses anonymous HTML caching. The isolated production Worker smoke tests actual edge hits, hydration/navigation and maintenance/generation behavior. For a separately requested HTML-cache audit, verify real anonymous production with:

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
4. Complete one-time owner setup and recovery readiness as applicable to the initial cutover; keep those tasks separate from future routine deploys.
5. Run `pnpm run deploy --env production`. The release saves cutover inventory, rejects outstanding legacy deploy hooks, disables matching Pages Git production builds if present, and publishes the Worker route only after compatible schema/content preparation.
6. Record actual production resource/route IDs and the Pages deployment retained for emergency rollback. Broader cutover/security review is separate from the routine health check.

Initial provisioning does not need the final cutover commit. All content releases require a clean immutable commit. Never change `cutover` in an uncommitted checkout just to get a release past this sequence.

## Owner authentication and acceptance

Cloudflare Access protects all staging requests and production admin/API/preview surfaces; `/api/public` remains public. The account-restricted Cloudflare sign-in provider, exact owner email, independent MFA, disabled default/preview Worker hostnames, and in-handler JWT checks remain enforced even when a review is pending.

Release authentication is a preflight, not a verification-phase task. A staging deploy obtains or refreshes its owner Access session before build work or the remote writer lock, then reuses that session for final verification. Production deployment credentials are loaded and validated from Keychain before release work begins; the public production apex is not an Access application and must not trigger an apex login. If any required preflight fails, stop while the currently ready release is still serving traffic.

Use normal Chrome for authentication. Enroll an independent authenticator at `https://icy-fog-1d6c.cloudflareaccess.com/#/Account`. If a Touch ID choice opens a phone QR but the phone has no passkey, cancel that challenge and select an enrolled method in normal Chrome. Do not disable MFA or reset devices merely to finish a deployment. The owner-only App Launcher permits first-device enrollment without requiring that new device in advance; site apps retain MFA.

After a database is initialized, run `pnpm owner:bootstrap --env staging` or `--env production` in an interactive terminal. Enter a distinct owner password. Never copy the development database/owner. `owner:recover` is explicit password/session recovery and revokes existing sessions; it is not a routine deployment step.

Owner review includes allowed identity/MFA, denied identity/account, Payload login and read-only admin, denied writes, preview/draft handling, expired/forged JWTs, session revocation, alternate-hostname protection and environment session isolation. Automated Worker checks cover only part of this list. An empty owners table means Payload admin cannot be used until bootstrap; it does not enable signup.

### Optional audits

`pnpm verify:prod <origin>` runs the full Worker/browser audit. `node test/remote-performance.mjs <origin>` measures mobile performance. `remote:acceptance` and `remote:rehearse` remain explicit audit/recovery tools, including their legacy evidence format. They are not prerequisites for deploying to production. Do not invent passes or carry an old exception into new reports.

Full exports and actual restore drills can interrupt database service. Run them only as deliberately requested backup/recovery work, never automatically before an application deployment. Routine data changes retain Time Travel bookmarks in `backups/<release-id>/bookmark.json`; retention is the database plan's Time Travel window, not the R2 object's lifetime.

## Failure recovery and rollback

After a failed or ambiguous operation, run `pnpm release:status --env <environment>`. For online releases, `ready` means traffic is admitted; also inspect journal completion or verified rollback and the cleared lock to determine the result. A browser sign-in page is Access; “We’re updating the site” is application maintenance. Signing in alone does not clear maintenance. Inspect the journal phase before selecting recovery.

All mutations use a conditional R2 ownership lock and Pulumi locking. A stale heartbeat means interrupted work, not permission to steal ownership. Verify the process, its child writers and outstanding remote operations are stopped; the local recovery tool additionally checks host, dead PID and a two-minute quiet interval.

```sh
pnpm release:recover <release-id> --env staging --writer-stopped
pnpm run deploy --env staging --resume <release-id>
```

Resume uses the original commit and backup. If the application is already deployed and only its verification failed, use `pnpm release:verify <release-id> --env staging` after ownership recovery. It validates deployed source and migrations, runs the appropriate health check, and completes recovery. Legacy maintenance recovery reopens on success; online recovery never closes traffic. Verification tooling may have a different clean SHA; the application SHA remains unchanged and both are recorded.

For failed initial provisioning, use `pnpm remote:infra up --env <environment> --resume infra-<timestamp>` after recovery. Do not use initial provisioning against a content-initialized stack. If code must change to fix a failed release, preserve the former journal, recover its writer, commit the fix and start a new compatible release. Never rewrite the failed release's SHA.

For a failed restore rehearsal that already created its probe, recover the stopped writer, then run `pnpm remote:rehearse --env staging --backup backups/time-travel-<original-timestamp>/database.json`. Use the original encrypted pre-probe backup, not the subsequent safety snapshot. Resume requires maintenance, validates the export and matching content/owner identities, saves another safety backup, restores the exact bookmark and verifies probe removal before reopening. D1's restore bookmark is a [query parameter](https://developers.cloudflare.com/api/resources/d1/subresources/database/subresources/time_travel/methods/restore/); a JSON-body bookmark is ignored and returns error 7400. Rehearsal evidence records the recovery-tooling SHA separately from the unchanged deployed application SHA.

Application rollback is `pnpm run deploy --env production --rollback <completed-release-id>`. It requires compatible migrations, restores retained bundle/assets, preserves current content/authentication data, advances cache generation and verifies. Database restore is a separate explicitly requested recovery operation using the exact backup bookmark, never automatic application rollback; see the implementation reference.

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
