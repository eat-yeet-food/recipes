# Cloudflare remote operations

Start with [Cloudflare operations](cloudflare-operations.md) for daily deployment, verified account/resource topology, one-time credential enrollment, owner authentication, and failure recovery. This document retains implementation detail and historical context. Explicit owner-authorized performance/manual-review exceptions use the audited procedure in that runbook; failed checks are never reported as passes.

Implementation is on `codex/payload-remote`. As of the 2026-09-13 production cutover, unified operator/environment Keychain enrollment and recovery export, protected Pulumi bootstrap, both environments, staging restore rehearsal, and production routing are complete. **Staging and production are deployed and open**, with application `8df398195b929e9503e4f74ae2e98feb5bf700b6`. Production release `8df398195b92-1789307349954` passed Worker/browser verification and cleared its lock. Manual Payload owner bootstrap/review remains pending. The cutover recorded an explicit scoped exception for that pending review and failed performance measurements; these are not passing acceptance results. The required [page/image performance work](changes/payload-remote/performance-regression.md) remains open. See [the operator runbook](cloudflare-operations.md) for resource identities and [release evidence](changes/payload-remote/review.md) for historical observations.

Local development remains documented in `docs/payload-local.md`. Ordinary `dev`, `build`, `preview`, `content:sync` and `db:migrate` use local bindings. Remote commands require an explicit environment. No Doppler project, CLI wrapper or runtime integration is used.

## One operator setup

Use one account/zone-scoped Cloudflare operator token for local Pulumi and releases. Staging and production retain separate databases, buckets, Payload secrets, release-verification secrets, Access audiences and sessions. Existing state-encryption passphrases and runtime secrets are preserved. The operator token is shared deployment authority; it does not merge application environments.

Set these permissions once, restricted to the verified account and `eatyeet.com` zone:

| Scope | Permissions |
| --- | --- |
| Account | Workers Scripts Edit; Workers R2 Storage Edit; D1 Edit; Access: Apps and Policies Edit; Access: Organizations Edit; Access: Identity Providers Edit; Cloudflare Pages Edit; Account Settings Read; Billing Read |
| Zone | DNS Edit; Workers Routes Edit; Zone Read |

`Access: Apps` alone does not permit reusable policy creation. No API-token-management permission is needed. The setup inventory verifies accessible account/zone resources; successful reads do not prove all write permissions, so the complete permission list must be enrolled together.

```sh
pnpm remote:setup
pnpm run deploy --env staging
pnpm run deploy --env production
```

Setup asks for the operator token once, derives R2 credentials, generates missing environment secrets, and writes one encrypted recovery kit after a separately entered recovery passphrase. It then runs the protected Pulumi bootstrap. To reuse this installation's existing staging token after granting the complete permissions above, run `pnpm remote:setup --from staging`; no token needs copying or pasting. `--from` is for initial operator enrollment, not credential rotation.

The Keychain `operator` entry supplies Cloudflare/R2 deployment credentials. The existing `bootstrap`, `staging` and `production` entries retain environment secrets. Legacy credentials remain available for recovery and are not automatically revoked. Setup retries preserve generated secrets and never overwrite an existing environment's state passphrase or Payload secret. Deployment refuses an operator/environment pair until both are included in the completed recovery export.

The unified recovery file is under `.local/remote/recovery/operator-<timestamp>.json`. Store it separately from this Mac. Restore it with:

```sh
pnpm remote:setup --restore /path/to/operator-recovery.json
```

Normal deployment provisions a missing environment before releasing it. An interrupted provisioning/release still requires the explicit lock recovery/resume procedure below; expired heartbeats never authorize automatic lock removal. Routine production releases do not require the former manual acceptance gate; deploy both environments with `--env both`. MFA enrollment, owner password entry and recovery-passphrase entry remain personal steps. GitHub CI deployment is not enabled; the approved workflow continues to run locally from committed Git sources.

## Credentials and verified configuration

Use Pulumi CLI **3.230.0** and the locked Cloudflare provider **6.20.0**. Infrastructure is TypeScript in `infra/cloudflare/index.ts`. Releases run from this Mac; there is no privileged HTTP synchronization endpoint or direct Wrangler deployment. Wrangler is used for local emulation, remote Node bindings and bundle-only `deploy --dry-run`.

The operator must sign in to the Cloudflare account owning `eatyeet.com`, confirm the exact account-member owner email and enroll environment credentials. Never paste secrets into chat or checked-in files.

Wrangler OAuth is encrypted with its keyring enabled; its encryption key is held in macOS Keychain under service `wrangler`, account `default`. This login is separate from the environment deployment credentials below. When bootstrapping the Wrangler keyring, create its key with Security.framework over stdin before enabling the keyring so no secret is passed as a `security` command argument.

```sh
pnpm remote:credentials enroll --env bootstrap
pnpm remote:credentials export /path/to/offline/bootstrap-recovery.json --env bootstrap
pnpm remote:inventory --env bootstrap
```

For legacy per-environment recovery without an operator entry, repeat credential enrollment/export for `staging` and `production`. Each legacy entry contains a scoped Cloudflare API token, R2 access key/secret, Pulumi encryption passphrase, Payload secret and release-verification secret. Enrollment refuses to overwrite an existing entry.

For user API tokens with Workers R2 Storage permissions, `pnpm remote:credentials enroll --env bootstrap --derive-r2` needs only the API token. It verifies that the token is active, derives R2 credentials using Cloudflare's documented token-ID/SHA-256 mapping, and generates the state encryption passphrase in memory. In legacy mode, use distinct tokens for each environment. Export a recovery copy immediately afterward; the generated state passphrase is only in Keychain and that encrypted export. This option does not create permissions or prove R2 is enabled; complete inventory before provisioning. Without the flag, enrollment continues to accept separately issued R2 credentials and a manually entered state passphrase.

See [Cloudflare's R2 token derivation documentation](https://developers.cloudflare.com/r2/api/tokens/#get-s3-api-credentials-from-an-api-token).

Recovery passphrases require at least 9 characters, as requested by the owner. The generated Pulumi state encryption passphrase remains independent of this recovery passphrase.

Recovery import deliberately restores an existing entry:

```sh
pnpm remote:credentials import /path/to/offline/staging-recovery.json --env staging
```

macOS Keychain service is `com.eatyeet.release`, with separate `bootstrap`, `staging`, `production` accounts. Swift Security.framework passes secret data over pipes. Deployment children receive secrets through their environment, never command arguments. Exports use authenticated AES-256-GCM with scrypt and a separately entered recovery passphrase; store the export and that passphrase separately from the Mac. Keep the encryption passphrase stable. Credential rotation must preserve runtime secrets and state encryption unless following a separately reviewed rotation procedure.

API permissions must cover the verified account's Workers scripts/domains, D1, R2, Access applications/policies and identity providers/organization, Pages inventory/configuration, subscriptions, plus `eatyeet.com` zone/DNS/Workers routes. Restrict environment credentials as tightly as Cloudflare permits; application tokens are often account-scoped, so this is operational isolation, not a claim of per-Worker IAM isolation. R2 credentials need the private state bucket and that environment's media/cache/operations buckets. Bootstrap needs bucket creation and Access organization adoption. Confirm plan limits and D1 Time Travel retention from account inventory before migrations.

Inventory writes sanitized account/zone, DNS, Pages, hook identities, Workers, routes, D1, R2, Access and plan information under `.local/remote/bootstrap/inventory.json`. Hook trigger URLs and identity-provider secrets are not logged. Names never establish ownership.

Create `infra/cloudflare/bootstrap.json`, `staging.json`, `production.json` using verified values. Each has:

```json
{
  "accountId": "<verified account ID>",
  "zoneId": "<verified eatyeet.com zone ID>",
  "stateBucket": "<verified private state bucket>",
  "ownerEmail": "<confirmed account-member email>",
  "accessTeamDomain": "<verified team>.cloudflareaccess.com",
  "cloudflareIdpId": "<existing Cloudflare identity provider ID, if present>",
  "cutover": false,
  "imports": {}
}
```

These are non-secret configuration files and must be committed before releases. Existing resources need deliberate `imports` entries keyed by their Pulumi logical names, using import IDs from the pinned provider schema. Review every adoption preview. Never substitute guessed identifiers. Bootstrap imports the state bucket and existing Access organization; it requires a configured Zero Trust organization. An existing account-restricted Cloudflare identity provider should be imported rather than duplicated. Environment stacks obtain its output from bootstrap if their config omits `cloudflareIdpId`.

```sh
pnpm remote:bootstrap --env bootstrap
pnpm remote:infra preview --env staging
pnpm remote:infra up --env staging
pnpm remote:infra preview --env production
pnpm remote:infra up --env production
```

The private R2 backend explicitly uses the account S3 endpoint and region `auto`. Bucket creation precedes the first bootstrap lock; subsequent bootstrap changes share an R2 lock. State is passphrase encrypted. Pulumi retains checkpoint history; timestamped state copies and encrypted D1 exports expire after 30 days. Media and archived build assets are retained for rollback. Initial Workers return 503; first staging release initializes content.

`infra up` is only for initial provisioning. After a failed initial attempt, verify all writers and submitted operations have stopped, recover its lock, then run `pnpm remote:infra up --env staging --resume infra-<original-timestamp>`. Resume requires the original empty-stack backup, refuses any existing content release or initialized Worker, takes another backup, and converges the existing resources. Subsequent application/infrastructure updates use the release command. Secrets are Worker secret bindings. Never put runtime credentials into plaintext Pulumi settings.

## Access and owner setup

Staging uses `staging.eatyeet.com`; its entire host requires Access. Production protects `/admin`, `/api` and `/preview`, with a more specific bypass for `/api/public`. Cloudflare sign-in requires exact owner email, the selected identity provider and membership in the verified account. Independent MFA is required. The pinned provider's AMR matching setting requests reuse of identity-provider MFA; verify the actual behavior in staging because provider/API support differs. Existing organization authenticator restrictions are preserved. If Cloudflare sign-in does not provide acceptable MFA proof, enroll an independent authenticator.

Each environment has its own Access audience, D1 owners/sessions and Payload secret. Workers reject alternate hosts and validate Access JWT signature, issuer, audience, email and expiry before protected handlers. `workers.dev` and preview hostnames are disabled. Payload's password, HTTPS cookies, lockout, origin protection and revocable sessions remain required. Admin and REST mutations remain denied.

The bootstrap stack also owns the App Launcher at the verified Access team domain. It allows only the exact owner email through the account-restricted Cloudflare identity provider and account-membership policy. Cloudflare hosts independent MFA enrollment there under Account > MFA devices > Add an MFA device. The launcher is exempt from independent MFA so the first authenticator can be enrolled; staging and protected production applications still require it. Provisioning this launcher requires Access Apps and Policies Edit on the bootstrap deployment credential. An unconfigured launcher produces “Please contact your administrator to enable the Access App Launcher” and prevents first-device enrollment.

After first staging content release, bootstrap its separate owner:

```sh
pnpm owner:bootstrap --env staging
pnpm owner:recover --env staging
```

Use production equivalents after its database is initialized. Never import the development owner or reset its password. Owner commands retain the remote writer lock. Complete the browser checks before `--owner-reviewed`: exact allowed identity, denied other identity/account, MFA behavior, read-only admin, preview/drafts, denied mutations, expired/forged tokens, session revocation, alternate-hostname bypass and staging/production cookie isolation. The flag is a human attestation, not an automated claim these identity flows were exercised.

## Releases

```sh
pnpm content:plan --env staging
pnpm run deploy --env staging
pnpm release:status --env staging
```

A release requires a clean immutable Git commit and authenticates before build/lock work. Run `pnpm run deploy --env both` to preflight both environments and deploy staging then production. The build is reused after checksum verification. Under the shared lock the command revalidates state, plans content, records a Time Travel bookmark only when data changes, reuses existing media/archive objects, applies needed compatible migrations and atomic content updates, publishes through Pulumi and runs a short online health check. No maintenance flag or drain delay is used. There is no mandatory manual acceptance, restore rehearsal, or performance run.

D1 export blocks requests and is deliberately excluded from routine releases. Atomic content sync reads only Git-owned tables through ordinary paginated SELECTs into a private in-memory SQLite snapshot. Payload computes each complete document mutation there, then its writes replay in one D1 transaction via `batch()`. Statements outside Git-owned tables and parent deletion/replacement are rejected. Per-document batches are bounded; they are never split into partially visible updates. The database snapshot is not copied back. Owner sessions, ratings and replies continue to use live D1 and are never overwritten. Publication changes remain explicit, stable IDs are preserved, and missing source files never mean deletion. A partial sync may contain both old and new complete documents. Cache generations change before/after sync and on failure.

Previously applied migration checksums cannot change. New migrations must explicitly declare `export const onlineCompatible = true` after review for old/new app compatibility; add nullable/defaulted columns and stage incompatible features with expand/contract releases. A Worker version does not version D1 data. Destructive changes and actual database restore need separate recovery work, never an automatic outage in a normal deploy.

`control.json` remains ready through online deployments. Journals retain source SHA, migration checksums, previous state, content plan, Time Travel bookmark, asset manifest/bundle, phase timings and media upload/reuse counts. Static chunks from previous releases remain available for old browser tabs. Media and archives check digest, size and MIME in bounded parallel reads; only missing/changed bytes upload. Pulumi alone negotiates missing Worker assets, avoiding a duplicate pre-upload. `--code-only` is just an assertion against data changes; the default already skips unnecessary work.

A failed application health check attempts to restore and verify the previous archived bundle while preserving current data. If recovery succeeds it clears the lock but reports the candidate as failed. Failure in another phase, or failed rollback, retains the lock for explicit recovery. No online failure silently enables maintenance. Legacy maintenance recovery remains available for old journals and deliberate restore operations. A new clean compatible fix can follow stopped-writer recovery; never rewrite a failed release's SHA.

Maintenance handling in the Worker is retained only for explicit recovery, returning non-cacheable 503 with a short release/origin-bound verification token. Routine deploys never select it. Public caching still checks fresh release state and publication before serving bytes, with environment/release/generation keys and session/query/framework exclusions. See the operator runbook for current caching behavior.

Owner verification uses `cloudflared` **2026.9.1**, resolving `.local/remote/bin/cloudflared` first and then the system PATH. Cloudflare opens the normal browser only when its application session needs authentication. It reuses the app-scoped session cache managed by Cloudflare and captures JWT output privately; no separate Chrome for Testing sign-in or terminal input is needed. Deployment credentials still reside in Keychain. The installed macOS ARM64 archive is the official `cloudflare/cloudflared` release `cloudflared-darwin-arm64.tgz`, verified against SHA-256 `c27ab8fd0aa489449e3d201eb02f957ef460a13b613662928b1b23394bf1bcfe` before extraction. See [Cloudflare's CLI Access flow](https://developers.cloudflare.com/cloudflare-one/tutorials/cli/).

## Interrupted work, backup and restore

All remote mutation commands use a conditional R2 lock with unique ownership token, host, PID, heartbeat and phase. Pulumi also retains its own stack lock. Expiry never grants permission to steal a lock.

```sh
pnpm release:status --env staging
pnpm release:recover <interrupted-release-id> --env staging --writer-stopped
pnpm run deploy --env staging --resume <interrupted-release-id>
pnpm remote:backup --env staging
```

Before `--writer-stopped`, establish that the recorded process **and its child writers** have stopped and all submitted Cloudflare/Pulumi operations have settled. The tool checks matching release identity, same host, dead PID and a two-minute quiet interval; these checks alone do not prove orphaned subprocesses or remote operations stopped. The flag explicitly attests that additional investigation. If writer state is uncertain or the host is lost, revoke its Cloudflare and R2 credentials first, inspect pending API operations and Pulumi locks, then recover using replacement credentials and a reviewed conditional lock removal. There is deliberately no automatic cross-host force unlock. Do not blindly delete Pulumi locks or run `pulumi cancel` against a live update.

Interrupted online releases retain the lock and keep traffic open. Resume requires the original commit, rechecks actual state, and reuses the original recovery bookmark. Legacy interrupted maintenance releases remain closed until explicit recovery. If failure occurs after traffic reopened but before journal/lock cleanup, inspect actual status rather than assuming maintenance remains active.

If application deployment succeeded and only the `verify` phase failed, use `pnpm release:verify <release-id> --env staging` after the same writer-stopped recovery above. This checks the recorded phase, application/content identities, unchanged migration checksums and the actual deployed Worker source hash. It runs the short health check for online releases or the full Worker/browser contract for legacy maintenance recovery, reopening legacy traffic only on success. It preserves the application's original Git SHA and records the clean verifier commit separately, allowing verification-tool fixes without rebuilding an already deployed application. It refuses earlier interrupted phases and never replaces normal release locking.

```sh
pnpm remote:restore --env staging --backup backups/<release-id>/database.json --bookmark <exact-recorded-bookmark>
```

Restore requires an explicitly opened recovery maintenance window and a recovery point belonging to the same environment/database. `--backup` accepts either an encrypted `database.json` export or a routine release `bookmark.json` record. It creates another encrypted backup, invokes D1 Time Travel and leaves maintenance active. Verify owner sessions and resume a compatible release before reopening. The 30-day export retention does not extend the account plan's Time Travel window. For an older export, restore into isolated resources and verify integrity before any separately reviewed production replacement; the CLI does not silently replace a production database.

Application-only rollback:

```sh
pnpm run deploy --env production --rollback <completed-release-id>
```

This restores the old application and archived assets only when the migration set matches. It preserves current synchronized content, IDs and authentication data, and changes the cache generation. It does not undo migrations or content. If those are incompatible, reject application rollback and investigate an expand/contract fix or explicit recovery while keeping the serving application available.

## Optional audits and first production cutover

Run required local checks from `CLAUDE.md`, including image delivery and final Worker smoke. Review all screenshot states against the pre-migration source; do not refresh baselines simply to pass. Then:

```sh
pnpm remote:rehearse --env staging
pnpm remote:acceptance --env staging --owner-reviewed
```

These commands are explicitly requested audits, not routine release prerequisites. Rehearsal restores actual staging D1 after a probe mutation, verifies content/owner identities and reopens staging. Acceptance restores an encrypted SQL export into isolated SQLite and records full Worker/mobile/owner-review evidence in its legacy format. Export/restore can interrupt service; do not run them as automatic deployment gates. Production no longer consumes acceptance evidence.

For the initial cutover commit, set `production.json` `cutover: true` and commit it. Provision production initially with `cutover: false`; changing to true is applied by the production release. Inventory and retain the current Pages deployment and DNS. Disable external CI/deployment-hook callers and remove legacy production hooks; cutover refuses remaining hooks. The release turns off matching Pages Git production builds and records the previous flag. Retain the Pages project, deployment, custom domain and existing DNS target as origin rollback resources.

```sh
pnpm run deploy --env production
pnpm verify:prod https://eatyeet.com
node test/remote-performance.mjs https://eatyeet.com
```

Production traffic changes through the `eatyeet.com/*` Worker route; media gets a Worker custom domain. Indexing activates only for production cutover. Verify raw HTML/SEO/status, referenced Next assets, hydration/navigation, responsive images, private/public caches, Access denials and three-run mobile medians. Production performance is independent of local lab results.

Emergency route rollback to retained Pages: stop/recover the release writer first, preserve maintenance and the current journal, and use the saved inventory to identify the exact production Workers route. Remove only that route through a reviewed Pulumi change (temporarily remove its protection and use normal deletion rather than `retainOnDelete`). Keep the original Pages DNS target/domain intact. Confirm the retained Pages HTML and its referenced legacy assets before reopening any legacy automatic deployments. Do not delete D1/R2/Access or change DNS to a guessed Pages project. Reconcile the route change in Pulumi before another Worker release. This procedure must be rehearsed against the inventoried configuration before live cutover; no route ID has yet been verified.

References: [Wrangler Node bindings](https://developers.cloudflare.com/workers/wrangler/api/), [direct asset uploads](https://developers.cloudflare.com/workers/static-assets/direct-upload/), [R2 conditional S3 operations](https://developers.cloudflare.com/r2/api/s3/api/), [Access independent MFA and AMR](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/).
