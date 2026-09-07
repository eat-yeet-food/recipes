---
name: policy-theme-tokens
description: Use when adding or changing styling, Tailwind classes, CSS, or visual design tokens in this repository.
---

# Theme token policy

Use `packages/l8/web/src/styles/global.css` for semantic colors, reusable
geometry, typography, spacing, layers, and motion. Follow `docs/design-system.md`
for role pairings. `site-overrides.css` owns fonts and generated-prose rules,
not a separate feature palette. Retired editorial colors must not survive as
aliases. Status colors retain their semantic purpose.

One-off art-directed geometry and structural third-party primitive internals
may be local; raw component colors are not an exception. Favicon SVG colors
are self-contained artwork and cannot inherit page CSS.

Search touched sources for raw colors, missing compiled utilities and broad
selectors. Run `pnpm test:design-system` plus the required CLAUDE verification.
