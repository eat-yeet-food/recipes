---
name: cloudflare-operations
description: Deploy Eat / Yeet to Cloudflare, manage operator authentication, or recover and roll back a release. Use for staging/production operations, not ordinary local development.
---

# Cloudflare operations

Read `CLAUDE.md` and the daily workflow in `docs/cloudflare-operations.md`. Consult `docs/payload-remote.md` only for recovery/provisioning detail. Use the existing CLI; Pulumi owns Worker configuration, routes, domains and Access.

## Routine deploy

From the intended clean commit, run `pnpm run deploy --env both` for staging followed by production, or target one environment explicitly. Preserve the user's authorization across turns. Do not add manual acceptance, restore rehearsal, Lighthouse, full browser suites, owner-review attestations, or separate post-deploy verification to routine releases. The command runs its own short release/page/asset/ratings/access health check. Broader audits are separate work when requested or relevant to a concrete change.

Authenticate at the beginning. `--env both` loads both environments' Keychain credentials and obtains staging's owner Access session before either release starts. Production's public apex has no Access application; do not attempt an apex login. Use the pinned cloudflared normal-browser flow, capture tokens privately, and retain MFA. Complete personal input while the user is present, before build/deploy work.

Normal deploys keep traffic open. Never enable maintenance for an application deployment. Cloudflare replaces the Worker while the previous version serves. New migrations must explicitly declare `onlineCompatible = true` after review for old/new app compatibility; use expand/contract migrations. A destructive schema change or database restore is separate recovery work, not a routine release flag.

The CLI reuses a checksum-verified build across environments, uploads only missing/changed assets, and automatically skips unchanged migration/content work. `--code-only` is an optional assertion against data changes, not the fast path. Data changes record a D1 Time Travel bookmark. Full SQL exports block D1 and are not part of routine deployment. Each complete Payload content operation replays as one atomic D1 batch, excluding owner/review data. Do not bypass atomic sync.

## Failure and recovery

Inspect actual status and the journal after ambiguity/failure; do not start a parallel release. Failed application health triggers an attempt to restore and verify the previous bundle while preserving content/reviews. Successful recovery clears the lock, but the command still reports the candidate as failed. If recovery or another phase fails, inspect the retained lock and phase before resuming.

Remote mutations share a conditional R2 lock. Heartbeat expiry never permits takeover. Establish that the writer, children and outstanding operations have stopped before `release:recover`. Resume the original commit; use `release:verify` for interrupted verification, including legacy maintenance releases. Keep journals, migration checksums and recovery bookmarks intact; never rewrite SHAs or blindly delete locks.

## Setup and exceptional operations

Use existing Keychain credentials; do not reenroll on every deploy. Missing credentials use `remote:setup --from staging` for an existing installation or the encrypted recovery kit. Inspect presence, never values. User passwords/passphrases belong in the user's interactive terminal, not chat or command arguments. An agent PTY is not the user's terminal.

Restore drills, full exports and owner/admin/performance reviews remain explicit recovery/audit commands. They do not gate routine production releases. Keep historical evidence honest and distinct from current status. Retain Pages/DNS for documented emergency route rollback; do not guess IDs or accept unrelated Pulumi replacements. Report failed/attempted deployment accurately, never as live.
