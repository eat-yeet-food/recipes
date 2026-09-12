# Payload migration remote phase

Implement the approved Cloudflare Workers/D1/R2/Access production-cutover plan using locally operated Pulumi TypeScript. Replace Doppler with environment-specific macOS Keychain deployment credentials and Cloudflare runtime secrets. Preserve Git-owned content, stable source IDs, read-only admin, approved design, routes, formula saves, and retained legacy rollback resources.

Work includes local acceptance/LCP investigation; infrastructure/state/credential bootstrap; conditional release locking and recovery; backups, content planning/sync, immutable assets and release journals; owner Access/MFA and request guards; publication-checked media and generation-keyed public projections; staging restore/identity/performance acceptance; and production cutover/verification.

Deployment prerequisites remain authenticated Cloudflare access, confirmed owner identity, MFA review and recovery-secret enrollment. Account/resource identifiers must come from inventory. This branch must not be described as deployed before staging and production verification actually run.

Verification and remaining work are recorded in review.md. Operator commands and recovery procedures are in ../../payload-remote.md.
