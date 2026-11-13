# Decision: owner MCP connector and trial recipes

- Date: 2026-11-13
- Status: accepted for a trial; promotion or removal pending (see "Ending the trial")
- Operator doc: [`docs/mcp.md`](../../mcp.md)

## Context

Recipes are authored as YAML in Git and reach the site only through `content:sync` during a release. The owner wants to write and manage recipes from a chat assistant (ChatGPT first, Claude too), the way the earlier yeet service's MCP server allowed (`~/src/yeet/backend/internal/mcp/recipe`): search, read, create and publish a complete recipe with a stock photo, plus Remix and reviews. If that works well, GitOps for recipes may be retired.

## Decision

1. **One remote MCP endpoint in the existing Worker**, `/api/public/mcp`, stateless Streamable HTTP. It's production-only, because staging sits behind Cloudflare Access, which chat clients can't pass.
2. **The site is its own OAuth 2.1 authorization server**:
   - Dynamic client registration, restricted to ChatGPT and Claude callbacks plus loopback.
   - PKCE S256, with single-use 60-second codes bound to the client and callback.
   - Hashed one-hour access tokens and rotating 30-day refresh tokens, all revocable.
   - Identity comes from the existing Google sign-in. Only `OWNER_EMAIL` is admitted, both at the callback and on every request.
   - The member cookie path stays `/api/public/account`. The pending authorization rides in the existing short-lived sign-in cookie.
3. **A narrow exception to "Payload APIs are read-only"**:
   - Only the owner, only through MCP.
   - Writes go only to the new `trial_recipes` and `trial_media` tables, plus the owner's own Remix formulas and reviews through the same services the site uses.
   - Git content stays read-only.
   - Request-driven calls stay `overrideAccess: false` behind unforgeable capabilities.
4. **Trial recipes use the Git source shape** and the same validation and normalization (`authoring.mjs`). They are stored as source plus a normalized view model in JSON columns. Keeping them out of the block tables keeps the trial cheap to add and to drop.
5. **Trial recipes are public, badged "Trial", noindex**, and kept out of the sitemap and JSON-LD. Git wins a slug.
6. **Images are processed in the Worker by the Images binding**, mirroring the sync pipeline's variants, because there's no Sharp in the Worker. Pexels is the primary stock source and Unsplash is secondary. Imports are deduped by provider and photo, and the credit is stored.
7. **Freshness:** each write starts a new cache generation through a conditional `control.json` write, only while the site is ready. The release tool treats a generation-only change as no content change.

### Rejected

- **Writing into the Git-owned `recipes` tables.** Sync would fight runtime writes, and remote sync replays snapshots of those tables.
- **An external auth provider** (yeet used WorkOS AuthKit). It adds another vendor; Google sign-in and the member service already exist.
- **Draft-only trial recipes.** The owner chose public visibility to judge the real experience.

## Update 2026-11-13: public ChatGPT app

The owner chose a public listing in ChatGPT's app directory over a private connector, so anyone can find it and connect with one click. Since then:
- Any Google-signed-in member can connect. Members get reading, ratings and reviews, and their own Remix formulas. Recipe writing and photos stay owner-only, enforced by never registering those tools on a non-owner's server.
- Reviewers use a dedicated Google account with a password and no 2-step verification. Email/password sign-in stays forbidden.
- The privacy policy and terms cover AI-assistant connections. OpenAI's domain check is served from `OPENAI_APPS_CHALLENGE`.
- The submission kit is [`chatgpt-submission.md`](chatgpt-submission.md).

The "Ending the trial" options below still apply to trial recipes. Removing the connector (option B) would now also mean unpublishing the ChatGPT app.

## Consequences

- Two sources of truth for recipes during the trial. Search, lists and the app merge them, but reviews only attach to Git recipes.
- More attack surface on production: public OAuth endpoints (rate-limited) and a write-capable owner API. A stolen owner token can create and delete trial recipes and act on the owner's remixes and reviews. It can't touch Git content, members, or other members' data.
- Each trial write flushes the HTML, data and media edge caches (a new generation), which is acceptable at trial volume.
- The Unsplash license is met, but its API guideline prefers hotlinking and visible credit. Credits are stored, not yet shown.

## Ending the trial

The trial ends with one of two outcomes. Either way, record the result here and update CLAUDE.md, `docs/mcp.md` and the relevant tests in the same change.

### A. Unify: retire GitOps for recipes and drop the "trial" label

1. **One store.**
   - Move trial recipes into the `recipes` collection, which the site already renders, or move Git recipes into the runtime store, whichever survives the review below.
   - The source shape is identical, so a one-time migration script can read each trial `source` and write it through `toStoredRecord`. Give it a fresh `sourceId` namespace (`runtime:<slug>`).
   - Move `trial_media` rows into `media` with the same manifests. The R2 keys are already content-addressed and don't move.
2. **Change content sync's ownership.** Either stop syncing recipes from Git, or have sync own only `git:*` source IDs and never retire `runtime:*` records. Remove recipes from the atomic sync allowlist if Git no longer owns them.
3. **Replace the release-time image pipeline for recipes with the runtime one.** Bump the pipeline identity if the variants differ.
4. **Remove the trial distinctions:**
   - the `trial` flag and badge
   - the noindex, sitemap and JSON-LD exclusions
   - the "Git wins a slug" rule
   - "Git recipes are read-only" in tool descriptions
   - Then let `update_recipe` edit every recipe.
5. **Reviews:** they reference `recipes`, so once trial recipes live there they gain ratings automatically. Remove the "Git recipes only" note.
6. **Add history:** keep a revision history like Remix's `kitchen-revisions`, so edits made outside Git keep an audit trail and undo. Git used to provide both.
7. **Backups:** add the recipe tables to the D1 Time Travel / export routine as live data, not Git-reconstructible data.
8. **Drop the `trial_*` tables** in a reviewed contract migration after the data move ships.
9. **Rewrite CLAUDE.md's** "Git owns recipes…" and "Payload admin and APIs are read-only" sections to describe the new ownership.

### B. Remove: keep GitOps, delete the connector

1. Run `pnpm mcp wipe --env production`, then `pnpm mcp revoke --env production`, and remove the connector from ChatGPT and Claude.
2. Delete:
   - `/api/public/mcp`, `/api/public/oauth/*` and the `.well-known` OAuth routes
   - `next/mcp/**`
   - `content-cms/src/{mcp-auth,trial}.ts` and the merge in `service.ts`/`cms.ts`
   - the trial fallback in the media paths
   - the badge
   - `scripts/mcp-cli.ts` and the tests
   - the `IMAGES` binding and the stock-photo secrets
3. Keep the tables declared but unused, as with the retired ratings tables, until a reviewed contract migration drops them.
4. Keep `authoring.mjs` if it's useful to Git tooling; otherwise remove it.

### Inputs for the decision

- How often recipes were written through chat versus Git during the trial.
- Edit quality: validation failures the model couldn't recover from, and fixes that still needed Git.
- Whether trial recipes needed method options, calculators or learning links that the connector doesn't author yet.
- Operational cost: cache flushes, Images usage, OAuth issues.
