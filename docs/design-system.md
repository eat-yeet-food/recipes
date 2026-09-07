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
| `action-label` | Light text in ink workbench panels and filled recipe-card actions | Applying the same filled treatment to article-header utilities |
| `action-hover` | Warm dark hover with the same light label | Opacity that changes contrast unpredictably |
| `tint` | Occasional supporting prose callouts | Active controls, recipe facts, or workbench summaries; washed-out default surfaces |
| `brand-alt` | Small orange graphic accents and dough illustration | Default control shadows or orange small text |
| `input` | Checkbox boundary and legacy structural use | Bottom borders on text fields |
| `border` | Dividers on white reading surfaces | Pale rules on saturated yellow or ink |
| `border-on-brand` / `border-on-ink` | Surface-specific dividers on yellow / ink respectively | Reusing the white-surface divider regardless of its parent |
| `danger` / `danger-soft` | Actual errors, invalid fields, destructive actions | Decorative eyebrows, Learn headings, story chrome |
| `muted-foreground` | Readable secondary text | Arbitrarily transparent labels |

Use one strong yellow field per brand moment, with white space for long reading. Category choices use saturated yellow when unselected and ink when selected. Their pressed state remains explicit; do not communicate selection through color alone. A recipe body and its passive facts stay on the white reading surface; workbench chrome is yellow, fields use ink fills with cream text, and the result summary uses ink with yellow totals. Pale yellow is not the default treatment for everything. Do not copy an external site's theme into one feature. There is no separate Learn or recipe palette and no retired `--yeet-*` color alias.

## Shape and interaction

Standalone actions are pills. Fields use `radius-field`; cards and callouts use `radius-surface`. A full-height viewport sheet has square corners on every edge; use DialogContent’s `sheet` variant instead of inheriting floating-dialog rounding. Selection controls use `radius-choice` outside, `spacing-choice-inset` for padding/gap, and **outer radius minus inset** for the selected item. Never choose the two radii independently. Wrapped labels keep the same inset and inner radius.

Faceted filter lists use a compact reading rhythm on desktop and mobile: 14px Avenir labels (`text-sm`), 12px group headings (`text-xs`), 8px between rows, and 10px between checkbox and label. Omit per-option counts and count badges; show the matching recipe total above the results instead. Use Checkbox’s `compact` size (16px visible box) within a fully clickable label row of at least 24px (`spacing-filter-row`), with `radius-filter` corners. Rows grow for wrapped labels. The checkbox hit area is 24px and must not overlap adjacent rows. Group disclosures retain their expanded state and keyboard focus. Do not apply the standalone action’s 44px minimum height or field radius to every filter row. `FacetGroup` in `packages/l7/search` owns this treatment; the desktop sidebar and mobile disclosure share it. Search/Page stories cover unchecked, selected, long-label, and collapsible groups.

Text fields on white or yellow use a flat ink fill and light values/placeholders. Input and Select use the `on-ink` surface inside ink panels: a light fill with ink values and muted placeholders. Both treatments retain inset keyboard focus, no bottom rule, shadow, or underline, and visible external labels. Invalid fields expose `aria-invalid` and an associated message; error text on ink sits on `danger-soft` so it remains readable.

Select keeps native platform interaction but owns its visible chevron. The caret sits 16px inside the right edge, with reserved text padding so long values cannot run beneath it. It follows the field surface/error colors, is hidden from assistive technology, and does not intercept clicks.

Filled buttons use one flat surface; utility actions use a thin ink boundary around a transparent surface. Neither uses offset shadows, extra decorative outlines, translation on press, or underlined labels in any state. Keyboard focus on filled and outlined controls is a single inset indicator. Icons need a visible boundary when focused too; forced colors retain the system focus indicator. Real prose links remain underlined. A text action still uses button semantics for commands; navigation uses a real anchor.

Borderless text actions (`link`, text-sized `ghost`, and `quiet-on-ink`) have zero padding, no pill shape, left-aligned text, and a persistent underline. Hover thickens the underline without adding a background; keyboard focus keeps the underline and adds an outward outline. Their minimum target height is 24px, with separation supplied by the parent layout. Disabled actions lose the underline and use muted text without a fill. Use an explicit icon size for icon-only controls: they retain their dedicated target, icon cue, and visible focus. Disclosure rows, menu items, segmented choices, and labeled switches retain their own interaction patterns. Do not apply invisible pill padding to a text action.

Choose button emphasis by its role and parent surface. Article-header utilities use Button’s `utility` variant and `sm` size: a thin ink border, ink text and icons, a transparent background, and a muted hover fill. Compact padding retains the 44px target. Recipe-card Print and Pin actions keep the filled ink/cream treatment. On ink panels, primary actions use `on-ink` (yellow fill, ink label); secondary actions use `quiet-on-ink` (light underlined text, zero padding, transparent fill). Do not globally recolor all actions to resolve a mismatch in one context. `RecipeAction` owns the header/card distinction; the legacy `outline` alias remains separate from this utility treatment.

Binary settings use the dedicated Switch primitive with a visible adjacent label. Keep label and track together in a content-width group: an 8px gap for recipe-card Cook Mode, and 12px for header Cooking view. Do not stretch them apart with space-between. Do not wrap the label and track in Button or give their row a hover/selected background. Only the thumb position and track color communicate state; keyboard focus outlines the track. `CookModeSwitch` owns the labeled recipe usage. The recipe-card “Cook Mode” switch keeps surrounding content in place; the header “Cooking view” switch replaces Start Cooking / Back to Recipe and enables the focused article view. Turning Cooking view off also ends cook mode, preserving the prior behavior.

The wordmark component owns all sizes and light/dark contexts. App-bar navigation and the footer use the text lockup alone; the doughnut remains available for the favicon and larger brand contexts. The home hero uses the pizza-led “Big dough energy” composition without the “Made by you” badge. The approved favicon is the existing bitten doughnut recolored with **yellow icing and golden-orange dough**. Pink and chocolate studies are not approved assets. Preserve the bite, crumbs, and sprinkle silhouette. Favicon colors are self-contained SVG values because browser icons do not inherit page CSS.

## Hero and shell

`HomeHero` in `packages/l7/home` renders the active app’s copy from `apps/<app>/app.config.mjs`. Eat / Yeet’s current kicker is “Eat / Yeet · Savory, Sweet, or Yeet!” in the existing small uppercase treatment. The headline remains “Big dough energy”; the motto “Eat the best, yeet the rest” uses regular-weight body text, not bold. The former supporting tagline is removed. The Home/Brand Hero story consumes the same app config, so copy is not duplicated in story fixtures.

Navigation and footer retain their respective wordmark sizes, separator, and yellow Yeet treatment. Both omit the doughnut illustration. `Wordmark` in `packages/l6/ui-shell` owns this distinction; Shell/Wordmark and Shell/Layout render the production variants.

## Search layout

`SearchPage` in `packages/l7/search` places the title and mobile Filters button in one flex row with centered alignment and space between. The button does not shrink and retains its 44px action target; the title may wrap at narrow widths. Below the `lg` breakpoint, expanded filters appear beneath that row and are mounted only while open. At `lg` and above, filters use the desktop sidebar and the mobile trigger is hidden. Both presentations reuse `FacetGroup` and its compact filter-list contract.

The Filters button may indicate the number of active filters; individual options omit recipe counts. The matching recipe total sits above the result grid. These are distinct quantities and must not be mixed into option labels.

## Recipe layout

In the recipe-card action grid, the complete Cook Mode label/track group aligns to the right edge of its cell, flush with the outer right edge of the Your recipe summary below. Preserve this alignment when the actions stack on mobile; do not center the switch within its column.

The recipe header responds to its own available width. Below 52rem, the title occupies the full row; the byline and Cooking view share the next row, with the switch at the right. At 52rem and above, the switch sits beside the title/byline block. Do not let the switch squeeze a narrow title or split the title from its byline into disconnected rows. Pin and Print form a separate row of compact outlined utility actions: retain their icons and natural widths on mobile rather than stretching them into full-width pills.

Switching Cooking view on or off preserves the header width, recipe-column width, and horizontal position. It hides surrounding media/sidebar content without recentering the page; the configured sidebar column remains reserved at desktop widths. Vertical spacing may tighten when the surrounding content is hidden.

The recipe title and description appear once in the main page header, including print output; breadcrumbs and interactive header controls remain hidden in print. Below the image, the recipe body starts with facts and actions; do not repeat a Recipe eyebrow, title, or description, including in Cooking view. Body sections use level-two headings and ingredient/instruction subsections use level three.

Recipe descriptions and the recipe body use the shared `layout-recipe-copy` measure and matching outer page gutters. The unbordered recipe body has no extra horizontal card padding or rounded enclosure; its facts, ingredient lists, and instructions align with the description on desktop and mobile. Ingredient and instruction subsection headings, such as “Dough,” use bold 13px uppercase text. The “Your recipe” summary label uses the actual bold action font, rather than relying on a synthesized weight of the regular body face. Recipes/Actions and Recipes/Sections render the production owners for these treatments.

## Saved formulas

Start collapsed on each workbench visit. A compact underlined Saved formulas disclosure shows the family’s saved count and a chevron; `aria-expanded` and `aria-controls` identify its state and panel. Opening reveals the existing ink panel with load/save/update/delete controls. Collapsing retains draft names and selections but removes the panel from layout and keyboard navigation. Storage errors remain visible even when collapsed.

Save new and Update formula use native disabled buttons with the shared muted treatment whenever the name or formula is invalid, including duplicate names or values. Show a neutral name hint before interaction and associated validation feedback as the user edits or leaves the field; explain formula errors without requiring a click on a disabled action. Keep the submit-handler validation as a second guard.

The app-owned `WorkbenchPanel` gives Saved formulas and Your dough the same ink surface, field radius, padding, yellow heading, and light text. A single saved-formula picker replaces repeated Load/Default/Delete rows. Load and Delete are available for the chosen entry without entering the editor; Delete removes its saved default references and leaves any other loaded formula intact. Focus returns to the picker or name field after deletion. The editor distinguishes creating a formula from updating the loaded one; Make default applies to that loaded formula. Input and Select use their `on-ink` surface. Internal dividers use `border-on-ink`; separators directly on the yellow sheet use `border-on-brand`.

Saved names are required, normalized for Unicode and whitespace, limited to 80 characters, and unique within each dough family without regard to case. Creating or updating cannot duplicate another saved formula’s exact values. Updating a formula excludes its own ID from uniqueness checks. Existing saved entries are preserved until explicitly edited or deleted. Invalid calculator values block saving with an explanation. Name errors appear beside the input with `aria-invalid`, `aria-describedby`, and focus returned to the field; formula errors appear at the form. Save/update confirmation is announced only after browser storage succeeds. Batch size and oven remain outside the saved formula. Workbench copy is keyed by dough family: sourdough uses a sourdough name example and explains its starter and process settings; pizza uses pizza and oven copy. Starter hydration, flour blend, and the optional seed/levain build belong to the whole saved formula. There is no separately named starter profile or second save workflow; legacy profile storage is retained without active controls.

## Sourdough process

The sourdough plugin owns Mixing and fermentation controls, backed by `SourdoughProcess` in the recipe domain. Save/load, default formulas, and shared URLs carry mixing method, fold method, autolyse duration, salt addition, planned bulk duration, and individually timed folds with stable IDs. Older formulas acquire the authored process defaults. The workbench uses ChoiceGroup for hand/spiral mixing and stretch/coil folds, and NumberField for whole-minute times. Fold rows may be added or removed without changing the identity of other rows; narrow layouts stack fields and retain dedicated remove targets.

Times are elapsed from adding levain at the start of bulk. Validation requires increasing, unique fold times after salt addition and before bulk ends. Errors block saving and applying. Recipe content binds autolyse, bulk, and levain section IDs explicitly; the plugin produces matching instructions, levain build amounts, equipment, learning method, and total-time adjustment. Dough readiness remains part of the instructions. Machine-specific speeds and mixing durations come from the recipe’s typed `spiralMixer` plugin configuration, rather than generic low/medium labels. The sourdough recipe uses the Ooni Halo Pro profile in RPM: 165 RPM initial mixing, 90 RPM salt incorporation, and 165 RPM final mixing. The production story covers invalid timing, saved process restoration, and family-specific copy. These new keyboard/mobile interactions remain unverified while standalone checks are paused.

## Numeric editing

`NumberField` owns editable numeric text separately from accepted numeric values. Never coerce an empty input to zero, clamp it to one, or reformat it on each keystroke. Preserve partial decimals, cursor placement, and pasted text; accept decimal points and commas. Use a text input with numeric input mode for integer counts and decimal input mode for weights/percentages, a 16px input font, a 44px minimum target, and an external label with associated units. Enter/Done finishes editing. Keep invalid text visible on blur with an associated error; never silently round fractional quantities.

Display precision is separate from calculation precision. Format initial, externally updated, and blurred values by field role; retain typed text throughout editing. Formatting or simply focusing/blurring a field must never write a rounded value back to the model. Validate the actual value, not its rounded display. Drop unnecessary trailing zeros. Honor the display cap even for small values; keep the accepted calculation value unchanged. Do not add trailing `.0`.

| Workbench values | Display precision |
| --- | --- |
| Quantity | Integer; fractional entries remain invalid |
| Piece weight and total dough weight | Whole grams |
| Ingredient weights, flour rows, water, starter/levain weights and gram previews | Whole grams at 20g and above; at most 1 decimal below 20g |
| Target percentages, starter/seed blends and saved-formula summaries, except yeast | At most 1 decimal |
| Yeast percentage and its saved summary | At most 2 decimals |
| Yeast gram field, preview and applied ingredient amount | At most 2 decimals below 20g; whole grams at 20g and above |
| Seed-to-flour ratio and its readout | At most 1 decimal |
| Autolyse, salt addition, bulk duration and fold times | Whole minutes |

The workbench registers incomplete/invalid fields and disables formula saves and Apply until they are resolved. Previews use the last valid numbers and explain that state. Quantity, piece weight, and total dough weight are linked; total weight changes the piece weight without changing the count. Ingredient-weight drafts remain independent of the percentage conversion so temporarily invalid flour totals cannot erase the other weights. Explicit preset loads and reopening reset text drafts to the selected values. Switching calculator modes replaces that mode’s numeric fields. Flour row identities stay stable when names are edited, preserving focus and starter ingredient identity.

The production field and workbench stories cover clearing/replacing every numeric field, decimal commas and precision, invalid integer counts, direct total-weight edits, and flour-name focus. Real-device keyboard behavior still requires coordinated mobile review; do not infer it from a desktop build.

## Control contracts

| Component | Use and states | Keyboard / semantics |
| --- | --- | --- |
| Button | Primary, secondary, utility, ghost, quiet (`link` variant), on-ink, quiet-on-ink, danger, disabled, long label | Native button; `asChild` with a real anchor for navigation; 44px filled/outlined target, 24px minimum unpadded text action; focus follows treatment; `outline` is a compatibility alias for filled secondary |
| ChoiceGroup | Exclusive selection, short/wrapped labels; dark group, saturated yellow selected item | Named group of native pressed buttons; Tab, Enter, Space; all options reachable; selected state via `aria-pressed` |
| Input / Select / Textarea | Filled/empty, invalid, disabled, read-only; Input/Select support default and on-ink surfaces | Always a visible associated label; error association via `aria-describedby`; `aria-invalid` on affected field; use NumberField for editable numeric values |
| Checkbox | Checked, unchecked, disabled, focus; default and compact sizes, with compact reserved for labeled filter rows | Native/Radix behavior, accessible name, explicit checked state; visible check beyond color alone |
| NumberField | Blank/partial, integer, decimal, comma decimal, invalid, external reset | Text input with appropriate mobile keypad; live valid values; retained edit text and inline errors; owner blocks invalid saves |
| Switch | On/off, disabled, keyboard focus, on white/yellow; external label with no surrounding hover/selected fill | Radix switch semantics, `aria-checked`, associated label, Space toggles, track focus indicator and 44px hit area |
| Faceted filter list | Compact unchecked/selected rows, text-only labels without counts, wrapped labels, open/closed groups; white reading surface | Whole label toggles checkbox; at least 24px targets; Tab and Space operate checkboxes; Enter/Space operate group disclosure with `aria-expanded` |
| Mobile filter disclosure | Title and trigger share a row; active-filter indicator, closed/open, narrow title wrapping | Button exposes `aria-expanded` and `aria-controls`; expanded controls follow the header in reading order; desktop uses the sidebar |
| Dialog / workbench | Open, close, cancel, apply, invalid formula, weights/target, pizza/sourdough, saved formulas, shared state | Named dialog, Escape, contained focus, return to trigger, reachable mobile footer; formula behavior remains domain-owned |
| RecipeFacts | Unfilled fact strip with thin `border` rules, 12px muted labels and 18px semibold values; no rounded enclosure. Four columns at `xl`, two below, one at 360px and narrower | Passive definition list, no hover or pressed affordance; wraps long durations and yields without truncation |
| Dough summary | Ink result panel, yellow totals, ingredient labels left and tabular weights right | Definition lists; preserve units and all formula data; explicit error messages |
| Saved formulas | Same WorkbenchPanel surface as Your dough; one picker, explicit create/update flow, normalized unique names and no exact duplicate formulas | Native labeled form; Enter submits; inline announced errors; invalid input receives focus; storage failure never reports success |
| Content blocks | Markdown, media/captions, callouts, steps, comparison, sources | Real heading hierarchy; inline links identifiable; source return links named; table scroll local, never whole-page overflow |

## Story ownership and coverage

Stories live beside their owner. The web workbench story composes the app registry and exercises the real drawer. Storybook wrapper styles target only wrapper nodes, never descendant buttons, fields, or specimen headings. Component docs have ownership metadata and live API controls where appropriate.

Current handbook areas: pizza hero and app-owned copy, recipe facts, search palette, mobile search header and compact filter groups, foundations, action states, fields, selection states, text-only navigation/footer wordmarks and larger on-photo treatment, recipe/article/browse cards, empty results, content block composition, error states, and stateful dough-workbench variants. Workbench stories use isolated storage scope and working close/apply callbacks. Route tests cover persistence, shared configuration, restoration, and real recipe integration that a small canvas does not reproduce.

When adding a component, document purpose, anatomy, variants, token roles, keyboard/ARIA behavior, long labels, narrow layouts, owner, and adoption status. Include real states and usage; do not maintain a parallel story-only component or palette. New patterns must identify any untested state explicitly.

## Accessibility and release contract

Target WCAG 2.2 AA across the rendered app and handbook. Normal text needs at least 4.5:1; qualifying large text 3:1; visual control/state cues need 3:1 against adjacent colors where required for identification. Check actual text, fills, opacity, focus, selected, error, and hover states, not just tokens. Labels and explicit messages carry meaning beyond color.

Prefer 44px action targets and meet the 24px minimum target rule or its spacing exceptions. Verify 320 CSS-pixel reflow, text spacing, browser zoom, keyboard-only operation, no obscured focus, reduced motion, forced colors, and representative screen-reader flows. Dialogs must restore focus and keep mobile controls reachable. Automated checks cannot certify complete conformance.

- `pnpm test`: unit, build/type/boundary, routing/recipe behavior, rendered Storybook checks, design policy.
- `pnpm test:a11y`: app axe checks, including Learn and open workbench; all WCAG impact levels fail.
- `pnpm test:lighthouse`: accessibility and SEO budgets.
- `pnpm shots`: desktop/mobile app specimens, Learn and open workbench included.
- `pnpm parity`: compares the reviewed visual baseline and writes differences; baseline changes must be deliberately reviewed, never silently accepted.

A visual update must ship component and story changes together. Inspect screenshots and document remaining manual checks. A Storybook build alone is not verification. Token drift is checked by `scripts/check-design-system.mjs`, including negative fixtures for retired colors and raw UI values. Rendered checks also protect plain filled/outlined labels and underlined, unpadded text actions, concentric selection geometry, square viewport sheets, text-only navigation and fields without bottom edges. Status red and food-photo colors remain valid.

## Migration and compatibility

The September rollout replaces the former pink brand and tomato editorial roles with one system. Existing control signatures and formula behavior are preserved. Raw geometry is allowed for one-off art direction; reusable control geometry must use tokens. Generated third-party primitive internals may retain their structural utilities, but owned variants and values follow this contract. The site currently supports light mode; a dark surface in a story is a supported contrast context, not a claim that a full dark theme exists.

Accessibility references: [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) explains when boundaries are required and how inset focus contrasts with its fill; [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) defines the narrow-layout requirement.
