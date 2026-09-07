---
name: design-system
description: Apply Eat / Yeet's approved visual contract when changing branded UI, shared controls, or design-system stories and documentation. Excludes content-only and backend/domain work.
---

# Eat / Yeet design system

Read `CLAUDE.md` and `docs/design-system.md`. Runtime tokens are in
`packages/l8/web/src/styles/global.css`; the contract links their component
owners and required checks. Do not copy values into this skill.

Distinguish review artifacts from implementation. Respect the user's existing
approval and task scope; routine work within the approved system does not
require a fresh design approval. External references do not silently redefine
one feature's palette.

Reuse the production component and semantic role. Update its colocated stories
when its behavior or supported appearance changes. Storybook must render the
same component without wrapper CSS restyling its controls or headings.

For hero and shell edits, follow the handbook’s **Hero and shell** contract;
keep app-owned copy in the app config and stories on that same source. For
search edits, read **Search layout** and the compact faceted-filter contract
before applying generic action sizing. Preserve the distinction between
clickable target size and visible checkbox size, and between active-filter
indicators and result totals. Expose new reusable tokens in the token handbook.

Select actions, fields, and dividers for their parent surface using the
handbook’s context-specific variants. A mismatch in the article header does
not justify changing the approved recipe-card actions. Use a dedicated labeled
switch for binary settings rather than a button-styled row. Saved-formula UI
follows the **Saved formulas** contract and shares its panel with dough results;
keep validation, persistence feedback, and corresponding stories together.

When recording refinements, distinguish implemented changes from proposed
designs and historical verification from evidence for the current changes.

For a new pattern, record purpose, owner, supported states, keyboard semantics,
responsive behavior and adoption status in the handbook. Explicitly record
untested states; don't label a token swap or story build a completed system.

Classify the surface before styling it: action, editable field, passive facts, result summary, floating dialog, or viewport sheet. Consult the handbook for that role; do not make every surface a pale rounded card. Verify the component in its actual parent background, including nested shapes and input edges.

Verify actual text/fill pairings, keyboard focus, selected/error/disabled states,
long labels and narrow layouts. Run the CLAUDE checks, review rendered story/app
screenshots, and investigate axe incomplete results. Never auto-accept visual
baselines merely to pass a check. Plain button labels, coordinated nested radii,
and the approved favicon belong to the contract, not local exceptions.
