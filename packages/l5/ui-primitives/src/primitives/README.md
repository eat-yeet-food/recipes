# Owned controls and patterns

These components own shared interaction and styling. Import through
`@eat-yeet/l5-ui-primitives/primitives/<name>` and follow `docs/design-system.md`.
Every file here has a colocated Storybook page with its usage rules and states.

**Controls.** Button (`default`, `utility`, `ghost`, `link`, `on-dark`,
`quiet-on-dark`, `danger`) and Toggle (the pressed on/off control) in `button`;
Choice Group; Fields (`input`, `select`, `textarea`, `checkbox`, `input-group`)
with two surfaces, light (default) and `underline`; Number Field; Switch; Dialog
(`stripe` for action dialogs, `sheet` for viewport sheets); Command;
Navigation Link; Responsive Image.

**Patterns.** Surface (white card; `action` adds the brand stripe) and
AccentRule in `surface`; Eyebrow, PageTitle and SectionTitle in `typography`;
Breadcrumbs; Callout (`aside`, `danger`, `notice`); Disclosure.

Do not override these with feature-wide descendant selectors or story-only CSS,
and do not hand-roll their look elsewhere (the design-system checker fails on
hand-rolled pills, stripes, accent rules and dark fields). Add meaningful
variants here and update their usage and state stories.
