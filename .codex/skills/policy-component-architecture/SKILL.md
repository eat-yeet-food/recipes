---
name: policy-component-architecture
description: Use when adding or changing UI components, tests, stories, or project layout in this repository.
---

# Component architecture policy

Use the owners and layer graph in `CLAUDE.md`: primitives in `packages/l5`,
shared shell/catalog/content patterns in `packages/l6`, feature composition in
`packages/l7`, routes/bootstrap in `packages/l8/web`, app registries and
app-specific workbenches in `apps/<app>`. Do not create root `src/` files.

Colocate tests and stories with the module that owns behavior. Root `test/` is
for shared server, screenshot/baseline and production verification infrastructure.
Web stories may compose app registries through configured adapters, not import
generated data directly. Story examples reuse production controls.

Cross-package imports require the importing package's dependency and tsconfig
reference. Run boundaries and TypeScript checks. Storybook wrapper styles must
not alter specimen descendants. See `docs/design-system.md` for usage/state
coverage and handbook ownership.
