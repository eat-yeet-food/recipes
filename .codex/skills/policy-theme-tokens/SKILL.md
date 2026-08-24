---
name: policy-theme-tokens
description: Use when adding or changing styling, Tailwind classes, CSS, or visual design tokens in this repository.
---

# Theme Token Policy

Use theme tokens instead of inline visual literals.

For production UI, colors, typography, spacing scale, breakpoints, z-index, and
motion should come from `src/styles/global.css` or a scoped surface token such
as `.yeet` in `src/styles/site-overrides.css`. If a value is reused or
art-directed, add a named token first and use `var(--token)` in classes or CSS.

Acceptable exceptions are one-off geometric measurements that describe a
specific layout shape, third-party generated primitive internals, and comments
that document historical source values. Raw colors in components are not an
exception.

Before finalizing a styling change, search for raw color literals and broad
descendant selectors in touched files and either replace them with tokens or
document why the exception is necessary.
