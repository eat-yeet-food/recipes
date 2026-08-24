---
name: pre-final-verification
description: Use before making the final commit or final squash for a change, including work that spans multiple commits, and before closing out code changes in this repository.
---

# Pre-Final Verification

Before the final commit for this repo, follow the verification policy in
`CLAUDE.md`, especially the pre-final checklist in section 3. For work that
spans multiple commits, this runs during the change process before the final
commit, final squash, or handoff, not only after everything is already staged.

Required for UI, styling, layout, routing, metadata, or content-rendering
changes:

- `pnpm test`
- `pnpm run test:a11y`
- `pnpm run test:lighthouse`

For deploy or production-edge changes, also run `pnpm run verify:prod [origin]`
after deployment.

If a command cannot be run, record the exact blocker before closing out.
