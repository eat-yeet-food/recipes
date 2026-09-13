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

Normal releases need no credential enrollment, password copying, API-token changes, dashboard deployment, or manual maintenance toggle. The CLI loads Keychain credentials, builds immutable assets, takes the shared remote lock and backups, publishes through Pulumi, verifies, and reopens traffic. Cloudflare may open normal Chrome when the owner Access session expires. `cloudflared` captures its token privately; do not run verbose login commands that print tokens.

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
| Production D1 | `9a657ae9-d9b2-4bf4-ae3a-ac405b31cf5a`, `eatyeet-production-content` |
| Production R2 | `eatyeet-production-media`, `eatyeet-production-cache`, `eatyeet-production-operations` |
| Retained Pages project | `eatyeet`, ID `e835ec8d-674f-4b10-84a3-fe0c931beb5a` |
| Retained Pages deployment | `f7974d5e-22bd-44fe-9ee3-cf90daa9b734`, `https://f7974d5e.eatyeet.pages.dev`, commit `cb74614896e0d1ce5919072cf75127eb877156c3` |
| Legacy DNS | Apex and `www` proxied CNAMEs to `eatyeet.pages.dev` |

The bootstrap stack owns the state bucket, Access organization, account-restricted identity provider and owner MFA enrollment launcher. Each application stack owns its D1 database, three private R2 buckets, Worker, bindings, Access apps/policies, and delivery routes. There is no shared application database, Payload secret or owner session between staging and production.

Production cutover adds the apex Worker route `eatyeet.com/*` and media custom domain. It retains Pages and its DNS target for route rollback. `www` behavior remains part of the inventoried legacy configuration until deliberately migrated; do not assume an apex route also matches `www`.

The Worker checks configured hosts, Access tokens where required, current maintenance state and publication eligibility. Public content projections use OpenNext R2 caching by environment/schema/content generation. Public HTML remains dynamic. Originals have no public delivery route. Derivatives remain privately stored and eligibility-checked before cache delivery; browser bytes already downloaded cannot be recalled.

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

For emergency return to retained Pages, first stop/recover the release writer. Save state and the production route ID from live inventory. Through Pulumi, remove only `eatyeet.com/*` (deliberately disable that route's deletion protection/retention), keeping Pages, DNS, D1, R2 and Access intact. Verify Pages HTML and its referenced assets. Reconcile `cutover` and route ownership in Git/Pulumi before another release. Do not delete the zone, replace DNS with a guessed target, or reenable legacy automatic deployments before verifying the rollback.

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
