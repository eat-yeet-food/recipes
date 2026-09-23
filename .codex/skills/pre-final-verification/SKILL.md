---
name: pre-final-verification
description: Use before making the final commit or final squash for a change, including work that spans multiple commits, and before closing out code changes in this repository.
---

# Pre-Final Verification

Before the final commit for this repo, follow the verification policy in
`CLAUDE.md`, especially its Verification and Design system sections. For work that
spans multiple commits, this runs during the change process before the final
commit, final squash, or handoff, not only after everything is already staged.

Required for UI, styling, layout, routing, metadata, or content-rendering
changes:

- `pnpm test`
- `pnpm run test:a11y`
- `pnpm run test:lighthouse`

For deployment tooling changes, run focused remote tests, the isolated
`pnpm test:deploy-content` integration when atomic content sync changes, boundaries
and TypeScript checks. Do not run UI/Storybook/Lighthouse suites for tooling-only
changes. Routine deployment runs its own short health check; do not append a
second verification or performance gate. Run the full `verify:prod` browser audit
when specifically needed for a production-edge behavior change.

If a command cannot be run, record the exact blocker before closing out.

`pnpm test` includes rendered Storybook and design-policy checks. For visual
changes, review `pnpm shots` output and intentional baseline diffs as documented
in `docs/design-system.md`. A successful Storybook build is insufficient.
