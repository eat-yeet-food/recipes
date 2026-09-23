---
name: cloudflare-operations
description: Deploy Eat / Yeet to Cloudflare, inspect release readiness, enroll or recover operator credentials, and recover maintenance or roll back a release. Use for this repository's staging/production operations, not ordinary local development.
---

# Cloudflare operations

Read `CLAUDE.md` and `docs/cloudflare-operations.md`. Use `docs/payload-remote.md` for detailed release/lock semantics; read only the relevant section. Prefer the existing local CLI over dashboard mutations or reconstructed commands. No Doppler or direct Wrangler deployment.

Start by inspecting the clean Git SHA, intended environment, current release status and credential/recovery readiness. Complete every interactive authentication preflight before build work, taking a remote writer lock, or entering maintenance. Staging deploys obtain or refresh the owner Access session first and reuse it for verification. Production has no Access application on the public apex; validate its noninteractive Keychain/operator credentials at CLI startup and do not attempt a nonexistent apex Access login. Never begin a maintenance window while required authentication is unresolved. Treat user confirmation of a working page as page verification, not an unperformed owner/session/restore attestation. Preserve the user's authorization across turns; do not repeat permission questions for the same approved operation.

For established environments, use `pnpm run deploy --env staging|production`. A push does not deploy. Complete and commit the candidate before staging acceptance; production consumes evidence for that exact SHA. Read the release journal and actual `control.json` status before reporting completion. Production needs raw Worker/browser verification and separate mobile measurements after cutover.

If credentials are missing, inspect only their presence/export status, never values. Existing installations use `pnpm remote:setup --from staging` to adopt the operator token and preserve environment secrets. New installations use `remote:setup`; recovery uses its encrypted kit. Ask for all necessary personal input together, early, and continue independent work. Recovery passphrases and owner passwords are entered by the user in an interactive terminal, not chat or command arguments. An agent exec PTY is not the user's terminal; opening an app terminal does not attach it to that PTY. Provide the exact command and verify completion privately. Do not restart enrollment after a Keychain lock or incomplete export.

Use the pinned cloudflared normal-browser Access flow. The in-app/testing browser may have a different session or lack the owner's passkey. Never print cloudflared token output or disable MFA to complete login. The App Launcher enables first-device enrollment; site protection remains enforced.

Known performance or deferred manual-owner-review limitations can be accepted only when the user explicitly directs deployment despite their disclosure. `remote:acceptance --approved-limitations '<specific authorization and limitations>'` records measured results, false review/pass fields and a commit-bound 24-hour exception. Never infer exception authority from a routine deploy request or reuse it for a later release. Worker/security verification, actual restore, credentials, MFA enforcement and locks remain required.

Before remote mutation, follow the shared conditional R2 lock protocol. Heartbeat expiry never permits takeover. Inspect writer PID, children and outstanding operations; recover only when stopped and settled. For failed verification after application deployment, use `release:verify` after documented ownership recovery. For earlier phases, resume the original commit or start a new compatible committed fix while preserving the old journal/backup. Do not rewrite recorded SHAs, delete locks blindly, or rerun initial provisioning against an initialized app.

Preserve the Pages project and DNS for route rollback. Pulumi owns domains, routes, Access and Worker configuration; release tooling owns archived/uploaded assets. Never adopt guessed IDs or accept unrelated replacements in a preview. Keep state history, timestamped backups, authentication records and retained derivatives intact.

Update the runbook's observed resource IDs and current release evidence after changes. Keep secrets and generated artifacts ignored. When blocked, report the specific missing input or failing operation and completed work; do not describe an attempted deployment as live.
