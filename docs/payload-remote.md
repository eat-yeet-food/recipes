# Cloudflare remote operations

Implementation is on `codex/payload-remote`. R2 and Zero Trust Free are active, bootstrap Keychain enrollment and its encrypted recovery export are complete, and full account inventory succeeds. The protected bootstrap stack has imported the private state bucket, existing Access organization and account-restricted Cloudflare sign-in provider. Private R2 delivery, 30-day backup retention and lock cleanup are verified. Staging credentials and recovery export are enrolled, and staging infrastructure is provisioned. **The first staging content release, owner MFA review, recovery rehearsal, production credentials/provisioning and cutover remain incomplete.** See `docs/changes/payload-remote/review.md` for evidence and blockers.

Local development remains documented in `docs/payload-local.md`. Ordinary `dev`, `build`, `preview`, `content:sync` and `db:migrate` use local bindings. Remote commands require an explicit environment. No Doppler project, CLI wrapper or runtime integration is used.

## Credentials and verified configuration

Use Pulumi CLI **3.230.0** and the locked Cloudflare provider **6.20.0**. Infrastructure is TypeScript in `infra/cloudflare/index.ts`. Releases run from this Mac; there is no privileged HTTP synchronization endpoint or direct Wrangler deployment. Wrangler is used for local emulation, remote Node bindings and bundle-only `deploy --dry-run`.

The operator must sign in to the Cloudflare account owning `eatyeet.com`, confirm the exact account-member owner email and enroll environment credentials. Never paste secrets into chat or checked-in files.

Wrangler OAuth is encrypted with its keyring enabled; its encryption key is held in macOS Keychain under service `wrangler`, account `default`. This login is separate from the environment deployment credentials below. When bootstrapping the Wrangler keyring, create its key with Security.framework over stdin before enabling the keyring so no secret is passed as a `security` command argument.

```sh
pnpm remote:credentials enroll --env bootstrap
pnpm remote:credentials export /path/to/offline/bootstrap-recovery.json --env bootstrap
pnpm remote:inventory --env bootstrap
```

Repeat credential enrollment/export for `staging` and `production`. Each entry contains a scoped Cloudflare API token, R2 access key/secret, Pulumi encryption passphrase, Payload secret and release-verification secret. Enrollment refuses to overwrite an existing entry.

For user API tokens with Workers R2 Storage permissions, `pnpm remote:credentials enroll --env bootstrap --derive-r2` needs only the API token. It verifies that the token is active, derives R2 credentials using Cloudflare's documented token-ID/SHA-256 mapping, and generates the state encryption passphrase in memory. Use distinct tokens for each environment. Export a recovery copy immediately afterward; the generated state passphrase is only in Keychain and that encrypted export. This option does not create permissions or prove R2 is enabled; complete inventory before provisioning. Without the flag, enrollment continues to accept separately issued R2 credentials and a manually entered state passphrase.

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

A release requires a clean immutable Git commit. It validates sources and builds before locking; under the lock it revalidates remote state, records the content plan when a schema exists, backs up state/D1, archives and uploads assets/media, enables maintenance, drains requests, migrates, plans/synchronizes, checks no-op convergence, applies Pulumi, verifies the Worker, then reopens traffic. Initial databases are planned after the first schema migration. Missing source files never imply deletion. Previously applied migration checksums may not change. Destructive migrations are rejected for separate review.

`control.json` and release journals in the private operations bucket record Git SHA, migration checksums, asset manifest/bundle hash, previous application/content state, content plan, backup and phase. R2 holds archived asset bytes and bundle content, so rollback does not depend on the first laptop. Retained static chunks keep existing browser tabs functional.

Maintenance returns non-cacheable 503 with `Retry-After: 60`. A short, release/origin-bound HMAC token permits verification reads; staging additionally requires an Access session. Tokens go only to the configured site/media origins. Public HTML stays dynamic and no-store. Content projections use OpenNext R2 caching by environment, schema namespace and content generation. Publication and maintenance eligibility remain outside cached bytes. Media uses a private R2 bucket with a guarded Worker route; originals have no public route. Public derivatives get one-year browser caching without `immutable`. Retirement changes generation and delivery eligibility; downloaded browser bytes cannot be recalled.

## Interrupted work, backup and restore

All remote mutation commands use a conditional R2 lock with unique ownership token, host, PID, heartbeat and phase. Pulumi also retains its own stack lock. Expiry never grants permission to steal a lock.

```sh
pnpm release:status --env staging
pnpm release:recover <interrupted-release-id> --env staging --writer-stopped
pnpm run deploy --env staging --resume <interrupted-release-id>
pnpm remote:backup --env staging
```

Before `--writer-stopped`, establish that the recorded process **and its child writers** have stopped and all submitted Cloudflare/Pulumi operations have settled. The tool checks matching release identity, same host, dead PID and a two-minute quiet interval; these checks alone do not prove orphaned subprocesses or remote operations stopped. The flag explicitly attests that additional investigation. If writer state is uncertain or the host is lost, revoke its Cloudflare and R2 credentials first, inspect pending API operations and Pulumi locks, then recover using replacement credentials and a reviewed conditional lock removal. There is deliberately no automatic cross-host force unlock. Do not blindly delete Pulumi locks or run `pulumi cancel` against a live update.

Failures after mutation leave maintenance active and retain the lock. Resume requires the original commit and rechecks actual remote state; it reuses the original pre-release backup. If failure occurs after traffic reopened but before journal/lock cleanup, inspect actual status rather than assuming maintenance remains active.

```sh
pnpm remote:restore --env staging --backup backups/<release-id>/database.json --bookmark <exact-recorded-bookmark>
```

Restore requires existing maintenance and a backup belonging to the same environment/database. It creates another encrypted backup, invokes D1 Time Travel and leaves maintenance active. Verify owner sessions and resume a compatible release before reopening. The 30-day export retention does not extend the account plan's Time Travel window. For an older export, restore into isolated resources and verify integrity before any separately reviewed production replacement; the CLI does not silently replace a production database.

Application-only rollback:

```sh
pnpm run deploy --env production --rollback <completed-release-id>
```

This restores the old application and archived assets only when the migration set matches. It preserves current synchronized content, IDs and authentication data, and changes the cache generation. It does not undo migrations or content. If those are incompatible, keep maintenance active and perform explicit restore/recovery.

## Staging acceptance and production cutover

Run required local checks from `CLAUDE.md`, including image delivery and final Worker smoke. Review all screenshot states against the pre-migration source; do not refresh baselines simply to pass. Then:

```sh
pnpm remote:rehearse --env staging
pnpm remote:acceptance --env staging --owner-reviewed
```

Rehearsal restores actual staging D1 after a probe mutation, verifies content/owner identities and reopens staging. Acceptance restores the encrypted SQL export into isolated SQLite, runs Worker verification and three-run mobile measurements, and requires the identity review attestation. Acceptance is stored in the private state bucket for the exact Git SHA. Production release refuses a different SHA without its own accepted staging release.

Before staging acceptance for the cutover commit, set `production.json` `cutover: true` and commit it. Provision production initially with `cutover: false`; changing to true is applied by the production release. Inventory and retain the current Pages deployment and DNS. Disable external CI/deployment-hook callers and remove legacy production hooks; cutover refuses remaining hooks. The release turns off matching Pages Git production builds and records the previous flag. Retain the Pages project, deployment, custom domain and existing DNS target as origin rollback resources.

```sh
pnpm run deploy --env production
pnpm verify:prod https://eatyeet.com
node test/remote-performance.mjs https://eatyeet.com
```

Production traffic changes through the `eatyeet.com/*` Worker route; media gets a Worker custom domain. Indexing activates only for production cutover. Verify raw HTML/SEO/status, referenced Next assets, hydration/navigation, responsive images, private/public caches, Access denials and three-run mobile medians. Production performance is independent of local lab results.

Emergency route rollback to retained Pages: stop/recover the release writer first, preserve maintenance and the current journal, and use the saved inventory to identify the exact production Workers route. Remove only that route through a reviewed Pulumi change (temporarily remove its protection and use normal deletion rather than `retainOnDelete`). Keep the original Pages DNS target/domain intact. Confirm the retained Pages HTML and its referenced legacy assets before reopening any legacy automatic deployments. Do not delete D1/R2/Access or change DNS to a guessed Pages project. Reconcile the route change in Pulumi before another Worker release. This procedure must be rehearsed against the inventoried configuration before live cutover; no route ID has yet been verified.

References: [Wrangler Node bindings](https://developers.cloudflare.com/workers/wrangler/api/), [direct asset uploads](https://developers.cloudflare.com/workers/static-assets/direct-upload/), [R2 conditional S3 operations](https://developers.cloudflare.com/r2/api/s3/api/), [Access independent MFA and AMR](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/).
