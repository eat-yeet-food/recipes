# Owned controls

These components own shared interaction and styling. Import through
`@eat-yeet/l5-ui-primitives/primitives/<name>` and follow `docs/design-system.md`.
Their colocated Storybook pages show production components and supported states.

Button uses flat fills, plain labels and inset keyboard focus. `asChild` renders
a real navigation anchor. The legacy `outline` variant is a filled-secondary
alias; new callers should say `secondary`. `link` means a quiet button treatment,
not underlined text or a change in semantics.

ChoiceGroup derives nested radii from the shared outer radius and inset. Input,
Select and Textarea share field geometry; visible labels and associated errors
remain the caller's responsibility. Fields use flat ink fills with inset focus and no bottom edge. DialogContent's `sheet` variant removes every corner radius for viewport-attached sheets; floating dialogs retain surface rounding. Dialog and Checkbox retain Radix semantics.

Do not override these with feature-wide descendant selectors or story-only form
CSS. Add meaningful variants here and update their usage and state stories.
