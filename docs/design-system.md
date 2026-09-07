# Eat / Yeet design system

Yellow + ink is the approved identity (September 2026). Avenir is for reading and controls, Geller for article headings, Bowlby for the wordmark and expressive brand moments. Food photography and occasional organic accents carry the playfulness. The kitchen tools stay easy to read.

## Sources of truth

- Runtime values: `packages/l8/web/src/styles/global.css`. Color swatches in **Foundations / Design Tokens** resolve these values at runtime.
- Fonts and generated Markdown styling: `packages/l8/web/src/styles/site-overrides.css`.
- Owned controls: `packages/l5/ui-primitives/src/primitives`; their colocated stories render the same components used by the app.
- Shared content patterns: `packages/l6/ui-content-blocks`, catalog cards: `packages/l6/ui-catalog`, chrome and wordmark: `packages/l6/ui-shell`.
- Feature composition: `packages/l7`; app-specific formula workbench: `apps/eatyeet/src/workbenches`.
- Workflow and required checks: `CLAUDE.md`; agent routing: `.codex/skills/design-system/SKILL.md`.

Run `pnpm storybook` for the interactive handbook. `pnpm test:storybook` builds it and runs its rendered stories, interactions, and accessibility checks. Release evidence and remaining manual limitations are recorded in [design-system-verification.md](design-system-verification.md). This document records decisions and usage, not a second set of runtime CSS values.

## Color roles and hierarchy

| Role | Use | Avoid |
| --- | --- | --- |
| `brand` | Dominant sunshine field, brand sticker, selected brand moments | Small yellow text on white; tinting every reading surface |
| `ink` / `primary` | Reading and flat filled primary actions | Red editorial accents or separate recipe palettes |
| `action-label` | Cream labels on ink controls, including on yellow panels | Yellow-on-yellow repetition around a dark button |
| `action-hover` | Warm dark hover with the same light label | Opacity that changes contrast unpredictably |
| `tint` | Occasional supporting prose callouts | Active controls, recipe facts, or workbench summaries; washed-out default surfaces |
| `brand-alt` | Small orange graphic accents and dough illustration | Default control shadows or orange small text |
| `input` | Checkbox boundary and legacy structural use | Bottom borders on text fields |
| `danger` / `danger-soft` | Actual errors, invalid fields, destructive actions | Decorative eyebrows, Learn headings, story chrome |
| `muted-foreground` | Readable secondary text | Arbitrarily transparent labels |

Use one strong yellow field per brand moment, with white space for long reading. Category choices use saturated yellow when unselected and ink when selected. Their pressed state remains explicit; do not communicate selection through color alone. A recipe body stays white; workbench chrome is yellow, fields use ink fills with cream text, and the result summary uses ink with yellow totals. Pale yellow is not the default treatment for everything. Do not copy an external site's theme into one feature. There is no separate Learn or recipe palette and no retired `--yeet-*` color alias.

## Shape and interaction

Standalone actions are pills. Fields use `radius-field`; cards and callouts use `radius-surface`. A full-height viewport sheet has square corners on every edge; use DialogContent’s `sheet` variant instead of inheriting floating-dialog rounding. Selection controls use `radius-choice` outside, `spacing-choice-inset` for padding/gap, and **outer radius minus inset** for the selected item. Never choose the two radii independently. Wrapped labels keep the same inset and inner radius.

Text fields use a flat ink fill, light values/placeholders, and inset keyboard focus; no bottom rule, shadow, or underline. Visible external labels distinguish editing from actions.

Buttons have a single flat fill: no offset shadows, decorative outlines, translation on press, or underlined labels in any state. Keyboard focus is a single inset indicator. Icons need a visible boundary when focused too; forced colors retain the system focus indicator. Real prose links remain underlined. A quiet button still uses button semantics and does not become a link merely because it is visually quiet.

The wordmark component owns all sizes and light/dark contexts. App-bar navigation and the footer use the text lockup alone; the doughnut remains available for the favicon and larger brand contexts. The home hero uses the pizza-led “Big dough energy” composition without the “Made by you” badge. The approved favicon is the existing bitten doughnut recolored with **yellow icing and golden-orange dough**. Pink and chocolate studies are not approved assets. Preserve the bite, crumbs, and sprinkle silhouette. Favicon colors are self-contained SVG values because browser icons do not inherit page CSS.

## Control contracts

| Component | Use and states | Keyboard / semantics |
| --- | --- | --- |
| Button | Primary, secondary, ghost, quiet (`link` variant), danger, disabled, long label, on-yellow | Native button; `asChild` with a real anchor for navigation; 44px default target; inset focus; `outline` is a compatibility alias for filled secondary |
| ChoiceGroup | Exclusive selection, short/wrapped labels; dark group, saturated yellow selected item | Named group of native pressed buttons; Tab, Enter, Space; all options reachable; selected state via `aria-pressed` |
| Input / Select / Textarea | Filled/empty, invalid, disabled, read-only; native select for platform behavior | Always a visible associated label; error association via `aria-describedby`; `aria-invalid` on affected field; never replace numeric semantics with styled text |
| Checkbox / cook switch | Checked, unchecked, disabled, focus | Native/Radix behavior, accessible name, explicit checked state; visible check or moving thumb beyond color alone |
| Dialog / workbench | Open, close, cancel, apply, invalid formula, weights/target, pizza/sourdough, saved formulas, shared state | Named dialog, Escape, contained focus, return to trigger, reachable mobile footer; formula behavior remains domain-owned |
| RecipeFacts | One saturated yellow fact panel, bold values, quieter labels; no individual pale tiles | Passive definition list, no hover or pressed affordance; wraps long durations and yields |
| Dough summary | Ink result panel, yellow totals, ingredient labels left and tabular weights right | Definition lists; preserve units and all formula data; explicit error messages |
| Content blocks | Markdown, media/captions, callouts, steps, comparison, sources | Real heading hierarchy; inline links identifiable; source return links named; table scroll local, never whole-page overflow |

## Story ownership and coverage

Stories live beside their owner. The web workbench story composes the app registry and exercises the real drawer. Storybook wrapper styles target only wrapper nodes, never descendant buttons, fields, or specimen headings. Component docs have ownership metadata and live API controls where appropriate.

Current handbook areas: pizza hero, recipe facts, search palette, foundations, action states, fields, selection states, wordmark sizes and on-photo treatment, recipe/article/browse cards, empty results, content block composition, error states, and stateful dough-workbench variants. Workbench stories use isolated storage scope and working close/apply callbacks. Route tests cover persistence, shared configuration, restoration, and real recipe integration that a small canvas does not reproduce.

When adding a component, document purpose, anatomy, variants, token roles, keyboard/ARIA behavior, long labels, narrow layouts, owner, and adoption status. Include real states and usage; do not maintain a parallel story-only component or palette. New patterns must identify any untested state explicitly.

## Accessibility and release contract

Target WCAG 2.2 AA across the rendered app and handbook. Normal text needs at least 4.5:1; qualifying large text 3:1; visual control/state cues need 3:1 against adjacent colors where required for identification. Check actual text, fills, opacity, focus, selected, error, and hover states, not just tokens. Labels and explicit messages carry meaning beyond color.

Prefer 44px action targets and meet the 24px minimum target rule or its spacing exceptions. Verify 320 CSS-pixel reflow, text spacing, browser zoom, keyboard-only operation, no obscured focus, reduced motion, forced colors, and representative screen-reader flows. Dialogs must restore focus and keep mobile controls reachable. Automated checks cannot certify complete conformance.

- `pnpm test`: unit, build/type/boundary, routing/recipe behavior, rendered Storybook checks, design policy.
- `pnpm test:a11y`: app axe checks, including Learn and open workbench; all WCAG impact levels fail.
- `pnpm test:lighthouse`: accessibility and SEO budgets.
- `pnpm shots`: desktop/mobile app specimens, Learn and open workbench included.
- `pnpm parity`: compares the reviewed visual baseline and writes differences; baseline changes must be deliberately reviewed, never silently accepted.

A visual update must ship component and story changes together. Inspect screenshots and document remaining manual checks. A Storybook build alone is not verification. Token drift is checked by `scripts/check-design-system.mjs`, including negative fixtures for retired colors and raw UI values. Rendered checks also protect plain button labels, concentric selection geometry, square viewport sheets, text-only navigation and fields without bottom edges. Status red and food-photo colors remain valid.

## Migration and compatibility

The September rollout replaces the former pink brand and tomato editorial roles with one system. Existing control signatures and formula behavior are preserved. Raw geometry is allowed for one-off art direction; reusable control geometry must use tokens. Generated third-party primitive internals may retain their structural utilities, but owned variants and values follow this contract. The site currently supports light mode; a dark surface in a story is a supported contrast context, not a claim that a full dark theme exists.

Accessibility references: [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) explains when boundaries are required and how inset focus contrasts with its fill; [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) defines the narrow-layout requirement.
