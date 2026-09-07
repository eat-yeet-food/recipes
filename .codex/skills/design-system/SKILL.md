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
not justify changing the approved recipe-card actions. For borderless text
actions, use the handbook’s shared unpadded, underlined treatment; do not borrow
filled-button spacing or remove the visible clickable cue. Use a dedicated labeled
switch for binary settings rather than a button-styled row. Saved-formula UI
follows the **Saved formulas** contract and shares its panel with dough results;
keep validation, persistence feedback, and corresponding stories together.
For numeric controls, follow **Numeric editing**: keep editable text separate
from accepted values, preserve blank/partial entries and focus, and block saves
while invalid. Reuse NumberField rather than coercing or formatting raw input
on every keystroke. Preserve stable identities for editable list rows.
Choose display precision from the handbook’s field-role table. Round resting
and blurred displays, not typed buffers or calculation state; never use a
rounded display as the value to validate. Follow the current cap: whole grams
at 20g and above, at most one decimal below 20g and for percentages/ratios,
and no trailing `.0`. Keep family-specific copy in the workbench's typed copy
mapping. Starter and process settings belong to the saved formula, without a
separate starter naming workflow. Sourdough process edits must update the
domain model, plugin state/recipe projection, and production stories together.
For recipe layout changes, follow **Recipe layout**: use the shared description
and body measure, preserve the title-row switch placement, and keep a switch’s
label attached to its track rather than stretching them across the parent.

When recording refinements, distinguish implemented changes from proposed
designs and historical verification from evidence for the current changes.

For a new pattern, record purpose, owner, supported states, keyboard semantics,
responsive behavior and adoption status in the handbook. Explicitly record
untested states; don't label a token swap or story build a completed system.

Classify the surface before styling it: action, editable field, passive facts, result summary, floating dialog, or viewport sheet. Consult the handbook for that role; do not make every surface a pale rounded card. Verify the component in its actual parent background, including nested shapes and input edges.

Verify actual text/fill pairings, keyboard focus, selected/error/disabled states,
long labels and narrow layouts. Run the CLAUDE checks, review rendered story/app
screenshots, and investigate axe incomplete results. Never auto-accept visual
baselines merely to pass a check. Context-appropriate action affordances, coordinated nested radii,
and the approved favicon belong to the contract, not local exceptions.
