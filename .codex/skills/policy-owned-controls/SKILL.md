---
name: policy-owned-controls
description: Use when repeated owned UI controls, links, buttons, or action rows need shared styling or behavior.
---

# Owned Controls Policy

When this app owns the markup, prefer a component over broad descendant CSS.

Use scoped CSS only for surfaces the component cannot directly style, such as
Markdown-rendered HTML, third-party generated markup, or specificity repairs
for existing global article styles. Repeated buttons, links, action rows,
cards, and controls should share a typed component or local helper that carries
the styling, behavior, and accessibility attributes together.

If two call sites need the same control treatment, create or reuse the component
before adding another selector like `.surface a, .surface button`.

Stories must render the production-owned control with working callbacks and
isolated state. Update its documented variants and interaction cases with the
component. Consult `docs/design-system.md`; avoid independent story-only CSS.
