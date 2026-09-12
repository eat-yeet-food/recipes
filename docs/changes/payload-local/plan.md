# Local Payload migration

Approved scope: Next.js App Router + Payload on local D1/R2 emulation. Git YAML/media remain authoritative; content synchronization upserts stable source IDs and repairs drift. Web content is read-only even for the owner. Preserve current UI, calculations, browser saves, routes, SEO and social metadata. Generate responsive image derivatives during sync, not requests. Run full local verification and record a remote-phase handoff after implementation. Do not provision or deploy remote resources.

Remote decisions: locally executed Pulumi TypeScript, private R2 state, Doppler secrets, Cloudflare Workers/D1/R2, owner-only Access/MFA, local release commands.

Implementation evidence and deviations are recorded in review.md and the final handoff.
