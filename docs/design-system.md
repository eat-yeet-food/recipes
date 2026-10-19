# Eat / Yeet design system

Yellow + ink is the approved identity (September 2026). Avenir is for reading and controls, Geller for article headings, Bowlby for the wordmark and expressive brand moments. Food photography and occasional organic accents carry the playfulness. The kitchen tools stay easy to read.

## Sources of truth

- Runtime values: `packages/l8/web/src/styles/global.css`. Color swatches in **Foundations / Design Tokens** resolve these values at runtime.
- Fonts and generated Markdown styling: `packages/l8/web/src/styles/site-overrides.css`.
- Owned controls: `packages/l5/ui-primitives/src/primitives`; their colocated stories render the same components used by the app.
- Shared content patterns: `packages/l6/ui-content-blocks`, catalog cards: `packages/l6/ui-catalog`, chrome and wordmark: `packages/l6/ui-shell`.
- Feature composition: `packages/l7` (Test Kitchen in `packages/l7/kitchen`); app-specific dough calculator: `apps/eatyeet/src/workbenches`.
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

Use one strong yellow field per brand moment, with white space for long reading. Category choices use saturated yellow when unselected and ink when selected. Their pressed state remains explicit; do not communicate selection through color alone. A recipe body and its passive facts stay on the white reading surface. Test Kitchen pages are page forms on white with underline fields; its library band is the one yellow moment, and the dough result panel uses ink with yellow totals. Pale yellow is not the default treatment for everything. Do not copy an external site's theme into one feature. There is no separate Learn or recipe palette and no retired `--yeet-*` color alias.

## Shape and interaction

Standalone actions are pills. Fields use `radius-field`; cards and callouts use `radius-surface`. A full-height viewport sheet has square corners on every edge; use DialogContent’s `sheet` variant instead of inheriting floating-dialog rounding. Selection controls use `radius-choice` outside, `spacing-choice-inset` for padding/gap, and **outer radius minus inset** for the selected item. Never choose the two radii independently. Wrapped labels keep the same inset and inner radius.

Faceted filter lists use a compact reading rhythm on desktop and mobile: 14px Avenir labels (`text-sm`), 12px group headings (`text-xs`), 8px between rows, and 10px between checkbox and label. Omit per-option counts and count badges; show the matching recipe total above the results instead. Use Checkbox’s `compact` size (16px visible box) within a fully clickable label row of at least 24px (`spacing-filter-row`), with `radius-filter` corners. Rows grow for wrapped labels. The checkbox hit area is 24px and must not overlap adjacent rows. Group disclosures retain their expanded state and keyboard focus. Do not apply the standalone action’s 44px minimum height or field radius to every filter row. `FacetGroup` in `packages/l7/search` owns this treatment; the desktop sidebar and mobile disclosure share it. Search/Page stories cover unchecked, selected, long-label, and collapsible groups.

**Standard form fields** on page surfaces use Input's `underline` surface: unboxed, transparent, ink value text, muted placeholder, a single ink bottom rule that thickens to 2px on focus and turns `danger` when invalid, with the visible label directly above. Use it for ordinary page forms such as Account settings and the Test Kitchen editor. **Filled fields** are reserved for presentation containers: dialogs/sheets, and forms nested inside a page on a yellow or ink panel, such as the recipe rating form. A page whose main purpose is the form (account pages, settings) uses the standard white layout. There, text fields on yellow use a flat ink fill and light values/placeholders. Input and Select use the `on-ink` surface inside ink panels: a light fill with ink values and muted placeholders. Filled treatments retain inset keyboard focus with no bottom rule, shadow, or underline; every treatment keeps a visible external label. Invalid fields expose `aria-invalid` and an associated message; error text on ink sits on `danger-soft` so it remains readable.

Select keeps native platform interaction but owns its visible chevron. The caret sits 16px inside the right edge, with reserved text padding so long values cannot run beneath it. It follows the field surface/error colors, is hidden from assistive technology, and does not intercept clicks.

`TextSelect` is the compact form for a choice that sits inside a line of label text: the chosen label is a borderless text action (persistent underline, trailing 14px chevron, inherited type) and the native select covers it, so the platform menu and keyboard behavior are unchanged. It has no fill, border, or pill; hover thickens the underline and keyboard focus adds one outward outline; choosing with a pointer leaves no outline behind. Long labels truncate within the available width instead of resizing their row. The accessible name comes from its `label`. Do not use it as a standalone form field; those keep a visible label and a field surface.

Filled buttons use one flat surface; utility actions use a thin ink boundary around a transparent surface. Neither uses offset shadows, extra decorative outlines, translation on press, or underlined labels in any state. Keyboard focus on filled and outlined controls is a single inset indicator. Icons need a visible boundary when focused too; forced colors retain the system focus indicator. Real prose links remain underlined. A text action still uses button semantics for commands; navigation uses a real anchor.

Borderless text actions (`link`, text-sized `ghost`, and `quiet-on-ink`) have zero padding, no pill shape, left-aligned text, and a persistent underline. Hover thickens the underline without adding a background; keyboard focus keeps the underline and adds an outward outline. Their minimum target height is 24px, with separation supplied by the parent layout. Disabled actions lose the underline and use muted text without a fill. Use an explicit icon size for icon-only controls: they retain their dedicated target, icon cue, and visible focus. Disclosure rows, menu items, segmented choices, and labeled switches retain their own interaction patterns. Do not apply invisible pill padding to a text action.

Choose button emphasis by its role and parent surface. Article-header utilities use Button’s `utility` variant and `sm` size: a thin ink border, ink text and icons, a transparent background, and a muted hover fill. Compact padding retains the 44px target. The filled card action variant remains available for compatibility; recipe pages use only header actions. On ink panels, primary actions use `on-ink` (yellow fill, ink label); secondary actions use `quiet-on-ink` (light underlined text, zero padding, transparent fill). Do not globally recolor all actions to resolve a mismatch in one context. `RecipeAction` owns the header/card distinction; the legacy `outline` alias remains separate from this utility treatment.

Binary settings use the dedicated Switch primitive with a visible adjacent label. Keep label and track together in a content-width group rather than stretching them apart with space-between. Do not wrap a switch in Button or give its row a hover/selected background. The recipe header's Cooking view action uses a toggle button alongside Pin and Print, as described under Recipe layout. It enables the focused article view and cook mode; turning it off ends both.

The wordmark component owns all sizes and light/dark contexts. App-bar navigation and the footer use the text lockup alone; the doughnut remains available for the favicon and larger brand contexts. The home hero uses the pizza-led “Big dough energy” composition without the “Made by you” badge. The approved favicon is the existing bitten doughnut recolored with **yellow icing and golden-orange dough**. Pink and chocolate studies are not approved assets. Preserve the bite, crumbs, and sprinkle silhouette. Favicon colors are self-contained SVG values because browser icons do not inherit page CSS.

## Hero and shell

`HomeHero` in `packages/l7/home` renders the active app’s copy from `apps/<app>/app.config.mjs`. Eat / Yeet’s current kicker is “Eat / Yeet · Savory, Sweet, or Yeet!” in the existing small uppercase treatment. The headline remains “Big dough energy”; the motto “Eat the best, yeet the rest” uses regular-weight body text, not bold. The former supporting tagline is removed. The Home/Brand Hero story consumes the same app config, so copy is not duplicated in story fixtures.

Navigation and footer retain their respective wordmark sizes, separator, and yellow Yeet treatment. Both omit the doughnut illustration. `Wordmark` in `packages/l6/ui-shell` owns this distinction; Shell/Wordmark and Shell/Layout render the production variants.

## Search layout

`SearchPage` in `packages/l7/search` places the title and mobile Filters button in one flex row with centered alignment and space between. The button does not shrink and retains its 44px action target; the title may wrap at narrow widths. Below the `lg` breakpoint, expanded filters appear beneath that row and are mounted only while open. At `lg` and above, filters use the desktop sidebar and the mobile trigger is hidden. Both presentations reuse `FacetGroup` and its compact filter-list contract.

The Filters button may indicate the number of active filters; individual options omit recipe counts. The matching recipe total sits above the result grid. These are distinct quantities and must not be mixed into option labels.

The global search palette opens and accepts typing immediately. Its published recipe index loads from the existing public API on first open, with a named loading status and a retry action for failures. Keep the typed query when data arrives or a retry succeeds; do not briefly announce an empty result while loading. Search/Palette stories cover both states, and the app interaction test delays the index response to exercise typing before it arrives.

## Recipe layout

Print Recipe, Pin Recipe, and Cooking view appear once in the main page header. The recipe body starts with facts and, on recipes with a calculator, the Test Kitchen link; do not add a second action row or Cook Mode switch.

The recipe header keeps the title and byline together, followed by Pin, Print, and Cooking view in a wrapping row. All three utility buttons share a 10rem width and 44px minimum height, with centered icons and labels and a 12px gap. Wrapped buttons retain the same width instead of expanding to fill the last row. Cooking view is a toggle button with `aria-pressed` and a yellow active fill.

Switching Cooking view on or off preserves the header width, recipe-column width, and horizontal position. It hides surrounding media/sidebar content without recentering the page; the configured sidebar column remains reserved at desktop widths. Vertical spacing may tighten when the surrounding content is hidden.

The image-to-body gap is 32px on desktop and 24px on mobile. In Cooking view, which hides the image, use a 12px header-to-stats gap on both desktop and mobile. RecipeFacts has no top margin; the parent owns this spacing. Recipe articles remove the shared shell’s additional top margin and inner top padding so these spaces do not accumulate above the stat tiles.

The recipe title and description appear once in the main page header, including print output; breadcrumbs and interactive header controls remain hidden in print. Below the image, the recipe body starts with facts and the Test Kitchen link; do not repeat a Recipe eyebrow, title, or description, including in Cooking view. Body sections use level-two headings and ingredient/instruction subsections use level three.

Recipes always render as written. The app's calculator plugin projects only its authored default into the recipe (dough weights, bound step text, sourdough process steps); there is no recipe-page calculator, summary or saved-formula choice. `RecipeKitchenLink` in `packages/l7/kitchen` is the only entry point: a yellow flask disc and one sentence on the white reading surface, between the facts and Ingredients, hidden in print. Signed-out readers and members without formulas see “make this dough your own in Test Kitchen”; members see their versions for this recipe (up to three named links, then a count) and Start another, loaded after hydration. Recipes/Sections and the recipe page test cover it.

Recipe descriptions and the recipe body use the shared `layout-recipe-copy` measure and matching outer page gutters. The unbordered recipe body has no extra horizontal card padding or rounded enclosure; its facts, ingredient lists, and instructions align with the description on desktop and mobile. Ingredient and instruction subsection headings, such as “Dough,” use bold 13px uppercase text. The “Your recipe” summary label uses the actual bold action font, rather than relying on a synthesized weight of the regular body face. Recipes/Actions and Recipes/Sections render the production owners for these treatments.

## Recipe ratings

`RecipeRating` in `packages/l7/recipes` follows Yeet's element placement below the recipe rather than inserting ratings among the title utilities. It uses a 28px bold section heading with a continuing rule and compact aggregate summary. Both recipe families use a yellow form surface with `radius-surface`, ink fields and an ink full-width submit action, matching the yellow Name dialog. The form has no border or shadow. Picker stars use ink outlines and ink selected fills for contrast on yellow; aggregate/review stars keep `brand-alt` on the white reading surface. The submit action uses the shared disabled treatment. Empty and unavailable states remain explicit, and print omits the interactive section. The form retains five 44px star targets at narrow widths.

The inline form uses native labeled radios: Tab enters/leaves the group, arrow keys change the score, and Space selects. Hover previews the filled stars; keyboard focus outlines the focused target. Submission is explicit and disabled without a selection or during loading/saving. Save errors retain the draft, and success is visible and announced. Ratings belong to the signed-in member: the form states "Posting as <name>", the member updates or deletes (`link` action "Delete my rating") their rating, and deletes their own replies. Signed-out readers see the aggregate and reviews; the yellow surface replaces the form with a short explanation and a full-width ink "Sign in to rate" link, and each review offers "Sign in to reply". Stories cover empty, aggregate, previous vote, signed out, keyboard submission, editing, deletion, reply/delete, failed save and unavailable reads. Actual device touch and assistive-technology review remain manual.

## Accounts

`packages/l6/ui-shell/src/account` owns sign-in UI. `AccountProvider` supplies the member and transport; pages never read the session cookie.

- **App bar.** Signed out: a "Sign in" nav link using the nav link treatment, returning to the current page and query afterwards. Signed in: a 44px ghost icon button with the member's initials on a `brand` square (`radius-control`). It opens a disclosure panel (white `radius-surface`, soft ink shadow) with name and email above full-width 44px menu rows ("Account settings", "Sign out"): bold ink text, no underline, a light ink hover fill and an inset focus outline. Escape closes and returns focus; clicking outside closes. The link renders until a remembered session loads, so anonymous pages never shift. The mobile menu shows the same states as a row.
- **Account pages** (`/account/sign-in`, `complete`, `settings`): a white page with a 36px display heading. Sign-in is one centered 440px column with a single full-width ink "Continue with Google" action and the Terms/Privacy note; settings uses labeled two-column rows with standard underline fields. Field errors sit on `danger-soft` below the field with `aria-invalid`/`aria-describedby`; form errors use an alert. Sign in and Create account share a page and toggle in place. Confirmation and reset results replace the form with a status message.
- **Public name dialog.** New Google members confirm their public name once in a yellow dialog before it appears on reviews. Dismissing it keeps the provider name for the session.

- **Test Kitchen** works signed out; only saving requires sign-in, which returns to the calculator with `?save=1` and opens the name step.

Stories: Shell/Account covers the signed-out and signed-in nav, menu and name dialog, sign-in (available, unavailable, Google failure, already signed in) and settings. Untested: real Google consent round trip and screen-reader review of the menu.

## Video blocks

YouTube content blocks use a labeled video title and the shared outlined “Watch on YouTube” link. They navigate to the hosted video; the reading page does not embed the third-party player. The Page Blocks stories exercise this same responsive row.

## Test Kitchen

Test Kitchen replaces Adjust recipe (approved October 2026, proposal variant A “Notebook”). It sits in the navigation beside Recipes and Learn. Owners: pages and shared controls in `packages/l7/kitchen`, the dough editor and results in `apps/eatyeet/src/workbenches`, routes in `packages/l8/web/src/app/(site)/kitchen`.

- **Library** (`/kitchen`): cards open each formula's bake sheet. One yellow band with the Bowlby “Test Kitchen” title and New formula; below it, the member's formulas grouped by dough family as white cards (recipe photo, Geller name, source recipe, facts line, Edited time), Start from a recipe cards on `muted`, and a collapsed Recently deleted disclosure with Restore. Signed-out visitors get the band, a one-line invitation and the start cards.
- **Formula editor** (`/kitchen/<recipe>/<id>`, reached through Edit formula): breadcrumb Test Kitchen › name › Edit; the formula's name is the h1, with a Rename icon button, “From <recipe>” and the Saved label. Header actions are utility History and Duplicate and a filled Bake sheet. A “Changed from the recipe” strip lists every difference as chips (label, struck-through old value, bold new value) with Reset to recipe. The editor is a page form on white: standard underline fields (`NumberField surface="underline"`, `Select surface="underline"`), section headings in bold Avenir, compact ChoiceGroup (44px, matching the fields) for input mode, oven and mixing, danger icon buttons for removing flour and fold rows. The ink “Your dough” panel (yellow total, labels left, tabular weights right) stays sticky beside it at `lg`, with Recent changes below. Below `lg` the results dock to the bottom as an ink bar (total, batch and a Bake sheet action) that expands to the full panel. Notes and Delete formula (danger) close the page.
- **Calculator** (`/kitchen/<recipe>`): the same layout for anyone, titled by the recipe, with the label “Kept in this browser” and a filled “Save to Test Kitchen” (“Sign in to save” when signed out).
- **Saving**: there is no Save button on a formula. Edits autosave (800ms debounce) with the revision they started from. The Saved label reads Saving…, Saved · time, “Not saved · fix the highlighted values” while fields are invalid, or a danger message with Try again; a failed save never claims success and keeps the edits. A 409 from another tab asks for a reload.
- **Naming**: the yellow Name dialog (bold Avenir title, filled ink field, hint below, error on `danger-soft`, quiet Cancel, filled submit disabled while invalid) serves Save, Duplicate and Rename. Names are 1–80 characters after normalization and unique per member regardless of case.
- **History**: a white full-height sheet (square corners) listing versions newest first, grouped by day, each described by what changed from the previous one; the current version sits on `tint`. Restore is a text action and adds a new version, so it can be undone from the confirmation.
- **Notices**: ink pill at the bottom (raised above the phone dock) with a quiet Undo and a dismiss icon; failures use `danger`. Delete returns to the library with Undo; deleted formulas stay in Recently deleted for 30 days.
- **Bake sheet** (`…/bake`): a saved formula's home page, where library cards, recipe-page links and Save land. The recipe rendered through `RecipeArticle` with the formula's numbers, titled by the formula, with Edit formula, Print and Cooking view but no Pin. A “Making N today” row on `tint` with a 44px stepper changes today's batch only (`?count=`), never the formula. The fixed app bar is hidden in print.

Keyboard: every control is native; the Name dialog and History sheet trap focus and close with Escape; the dock toggle exposes `aria-expanded`. Flour rows carry their blend in their accessible names (“Starter Bread flour percentage”) so dough and starter rows never share a name. Stories: Kitchen/Controls (save states, changes strip, Name dialog, History, stepper, notices) and Kitchen/Pages (library signed in and out, calculator, sourdough with an invalid blend, formula autosave, bake sheet). Untested: real-device touch on the dock, screen-reader review of History grouping, and the Google round trip before `?save=1`.

## Sourdough process

The sourdough plugin owns Mixing and fermentation controls, backed by `SourdoughProcess` in the recipe domain. Save/load, default formulas, and shared URLs carry mixing method, autolyse duration, salt addition, planned bulk duration, and individually timed folding steps with stable IDs and their own technique. Each step can be stretch and fold, coil fold, or lamination; legacy steps inherit the saved global fold method. Older formulas acquire the authored process defaults. The Test Kitchen editor uses ChoiceGroup for hand/spiral mixing, a labeled native Select for each step’s technique, and an app-owned DurationField pairing NumberField inputs labeled hr and min. Each pair has a visible group legend and individually named hours/minutes inputs; minutes accept 0–59, and invalid or blank input blocks saving and applying. The pair stays side by side within each responsive timing row. Saved values remain whole minutes; recipe instructions use compact durations such as 30m, 1h, 1:30h, and 4:50h. Rows may be appended, inserted between existing steps, or removed without changing the identity of other rows. Insertion suggests the midpoint between neighboring times and is disabled when no whole minute fits; narrow layouts stack fields and retain dedicated remove targets. Native select keyboard behavior applies. Formula duplicate detection compares each step’s time and effective technique, ignoring row IDs.

Times are elapsed from adding levain at the start of bulk. Validation requires increasing, unique fold times after salt addition and before bulk ends. Errors block saving and applying. Recipe content binds autolyse, bulk, and levain section IDs explicitly; the plugin produces matching instructions, levain build amounts, equipment, learning method, and total-time adjustment. Dough readiness remains part of the instructions. Machine-specific speeds and mixing durations come from the recipe’s typed `spiralMixer` plugin configuration, rather than generic low/medium labels. The sourdough recipe uses the Ooni Halo Pro profile in RPM: 165 RPM initial mixing, 90 RPM salt incorporation, and 165 RPM final mixing. The production stories cover invalid timing, inserting a lamination between stretch and coil folds, saved process restoration, distinct technique schedules, shared-state recipe instructions, and family-specific copy. The mixed-step editor has browser review at 1280, 390, and 320 CSS pixels, including native select-to-time keyboard navigation and recipe projection. See the September 8 entry in [design-system-verification.md](design-system-verification.md) for automated evidence and remaining limits.

## Pizza sizing

The pizza editor exposes a native Pizza size select in Usual batch, shared by both input modes. Recipe-owned `pizzaSizing` configuration supplies supported diameters and an authored diameter/ball-weight reference; the domain scales by area and rounds the preset to whole grams. NY pizza uses 16 inches / 480g: 10 inches / 188g, 12 / 270g, 14 / 368g, and 16 / 480g. Choosing a size updates ball weight, total dough, ingredient weights, toppings, yield, and stretching instructions. Quantity stays unchanged. Manual ball/total/ingredient-weight edits switch to Custom weight. Diameter belongs to the batch; compatible legacy weights in shared links can recover their matching size.

Sugar is editable in both pizza modes: baker’s percentage in Percentages and grams in Weights. It flows through formula calculations, saved summaries, recipe ingredients, and mixing instructions. The production story covers size selection, sugar conversion, apply/reopen, and custom weights. Standalone checks remain paused.

## Numeric editing

`NumberField` owns editable numeric text separately from accepted numeric values. Never coerce an empty input to zero, clamp it to one, or reformat it on each keystroke. Preserve partial decimals, cursor placement, and pasted text; accept decimal points and commas. Use a text input with numeric input mode for integer counts and decimal input mode for weights/percentages, a 16px input font, a 44px minimum target, and an external label with associated units. Enter/Done finishes editing. Keep invalid text visible on blur with an associated error; never silently round fractional quantities.

Display precision is separate from calculation precision. Format initial, externally updated, and blurred values by field role; retain typed text throughout editing. Formatting or simply focusing/blurring a field must never write a rounded value back to the model. Validate the actual value, not its rounded display. Drop unnecessary trailing zeros. Honor the display cap even for small values; keep the accepted calculation value unchanged. Do not add trailing `.0`.

| Calculator values | Display precision |
| --- | --- |
| Quantity | Integer; fractional entries remain invalid |
| Piece weight and total dough weight | Whole grams |
| Ingredient weights, flour rows, water, starter/levain weights and gram previews | Whole grams at 20g and above; at most 1 decimal below 20g |
| Target percentages, starter/seed blends and saved-formula summaries, except yeast | At most 1 decimal |
| Yeast percentage and its saved summary | At most 2 decimals |
| Yeast gram field, preview and applied ingredient amount | At most 2 decimals below 20g; whole grams at 20g and above |
| Seed-to-flour ratio and its readout | At most 1 decimal |
| Autolyse, salt addition, bulk duration and fold times | Whole hours + remaining minutes (0–59) |

The editor registers incomplete/invalid fields and pauses autosave and Save until they are resolved. Previews use the last valid numbers and explain that state. Quantity, piece weight, and total dough weight are linked; total weight changes the piece weight without changing the count. Ingredient-weight drafts remain independent of the percentage conversion so temporarily invalid flour totals cannot erase the other weights. Reset to recipe, Restore and reloading reset text drafts to the stored values. Switching calculator modes replaces that mode’s numeric fields. Flour row identities stay stable when names are edited, preserving focus and starter ingredient identity.

The production field and Kitchen/Pages stories cover clearing/replacing every numeric field, decimal commas and precision, invalid integer counts, direct total-weight edits, and flour-name focus. Real-device keyboard behavior still requires coordinated mobile review; do not infer it from a desktop build.

## Control contracts

| Component | Use and states | Keyboard / semantics |
| --- | --- | --- |
| Button | Primary, secondary, utility, ghost, quiet (`link` variant), on-ink, quiet-on-ink, danger, disabled, long label | Native button; `asChild` with a real anchor for navigation; 44px filled/outlined target, 24px minimum unpadded text action; focus follows treatment; `outline` is a compatibility alias for filled secondary |
| ChoiceGroup | Exclusive selection, short/wrapped labels; dark group, saturated yellow selected item; `compact` size (32px options, 44px overall) beside page-form fields such as the Test Kitchen editor | Named group of native pressed buttons; Tab, Enter, Space; all options reachable; selected state via `aria-pressed` |
| Input / Select / Textarea | Filled/empty, invalid, disabled, read-only; `underline` is the standard page-form surface, default (ink fill) and on-ink are for dialog and panel containers | Always a visible associated label; error association via `aria-describedby`; `aria-invalid` on affected field; use NumberField for editable numeric values |
| TextSelect | Inline choice inside label text: underlined value with a chevron, hover, focus, disabled, truncated long label, disabled unsaved entry. Untested: forced colors, touch and screen-reader review | Native select named by `label`; platform menu and arrow keys; one outward focus outline on the text |
| Checkbox | Checked, unchecked, disabled, focus; default and compact sizes, with compact reserved for labeled filter rows | Native/Radix behavior, accessible name, explicit checked state; visible check beyond color alone |
| NumberField | Blank/partial, integer, decimal, comma decimal, invalid, external reset | Text input with appropriate mobile keypad; live valid values; retained edit text and inline errors; owner blocks invalid saves |
| Switch | On/off, disabled, keyboard focus, on white/yellow; external label with no surrounding hover/selected fill | Radix switch semantics, `aria-checked`, associated label, Space toggles, track focus indicator and 44px hit area |
| Faceted filter list | Compact unchecked/selected rows, text-only labels without counts, wrapped labels, open/closed groups; white reading surface | Whole label toggles checkbox; at least 24px targets; Tab and Space operate checkboxes; Enter/Space operate group disclosure with `aria-expanded` |
| Mobile filter disclosure | Title and trigger share a row; active-filter indicator, closed/open, narrow title wrapping | Button exposes `aria-expanded` and `aria-controls`; expanded controls follow the header in reading order; desktop uses the sidebar |
| Dialog / sheet | Name dialog (Save, Duplicate, Rename; invalid and taken names), History sheet with Restore | Named dialog, Escape, contained focus, return to trigger; formula behavior remains domain-owned |
| RecipeFacts | Unfilled fact strip with thin `border` rules, 12px muted labels and 18px semibold values; no rounded enclosure. Four columns at `xl`, two below, one at 360px and narrower | Passive definition list, no hover or pressed affordance; wraps long durations and yields without truncation |
| Dough summary | Ink result panel, yellow totals, ingredient labels left and tabular weights right | Definition lists; preserve units and all formula data; explicit error messages |
| Account menu | Sign in link, initials trigger, open/closed panel, sign-out error | Disclosure: button with `aria-expanded`/`aria-controls`; Escape closes and restores focus; plain links and buttons inside |
| Test Kitchen | Library (signed in/out, recently deleted), calculator, formula page with autosave states, changes strip, History, bake sheet, phone dock | Native controls; Saved label is a polite status; Undo notices are announced; failed saves keep edits and never report success |
| Content blocks | Markdown, media/captions, callouts, steps, comparison, sources | Real heading hierarchy; inline links identifiable; source return links named; table scroll local, never whole-page overflow |

## Story ownership and coverage

Stories live beside their owner. The Kitchen/Pages story composes the app registry and exercises the real calculator. Storybook wrapper styles target only wrapper nodes, never descendant buttons, fields, or specimen headings. Component docs have ownership metadata and live API controls where appropriate.

Current handbook areas: pizza hero and app-owned copy, recipe facts, search palette, mobile search header and compact filter groups, foundations, action states, fields, selection states, text-only navigation/footer wordmarks and larger on-photo treatment, recipe/article/browse cards, empty results, content block composition, error states, and Test Kitchen controls and pages. Kitchen stories use isolated in-memory account and kitchen transports. Route tests cover saving through sign-in, autosave, History, bake sheets and real recipe integration that a small canvas does not reproduce.

When adding a component, document purpose, anatomy, variants, token roles, keyboard/ARIA behavior, long labels, narrow layouts, owner, and adoption status. Include real states and usage; do not maintain a parallel story-only component or palette. New patterns must identify any untested state explicitly.

## Accessibility and release contract

Target WCAG 2.2 AA across the rendered app and handbook. Normal text needs at least 4.5:1; qualifying large text 3:1; visual control/state cues need 3:1 against adjacent colors where required for identification. Check actual text, fills, opacity, focus, selected, error, and hover states, not just tokens. Labels and explicit messages carry meaning beyond color.

Prefer 44px action targets and meet the 24px minimum target rule or its spacing exceptions. Verify 320 CSS-pixel reflow, text spacing, browser zoom, keyboard-only operation, no obscured focus, reduced motion, forced colors, and representative screen-reader flows. Dialogs must restore focus and keep mobile controls reachable. Automated checks cannot certify complete conformance.

- `pnpm test`: unit, build/type/boundary, routing/recipe behavior, rendered Storybook checks, design policy.
- `pnpm test:a11y`: app axe checks, including Learn and Test Kitchen pages, dialogs and History; all WCAG impact levels fail.
- `pnpm test:lighthouse`: accessibility and SEO budgets.
- `pnpm shots`: desktop/mobile app specimens, Learn and Test Kitchen included.
- `pnpm parity`: compares the reviewed visual baseline and writes differences; baseline changes must be deliberately reviewed, never silently accepted.

A visual update must ship component and story changes together. Inspect screenshots and document remaining manual checks. A Storybook build alone is not verification. Token drift is checked by `scripts/check-design-system.mjs`, including negative fixtures for retired colors and raw UI values. Rendered checks also protect plain filled/outlined labels and underlined, unpadded text actions, concentric selection geometry, square viewport sheets, text-only navigation and fields without bottom edges. Status red and food-photo colors remain valid.

## Migration and compatibility

The September rollout replaces the former pink brand and tomato editorial roles with one system. Existing control signatures and formula behavior are preserved. Raw geometry is allowed for one-off art direction; reusable control geometry must use tokens. Generated third-party primitive internals may retain their structural utilities, but owned variants and values follow this contract. The site currently supports light mode; a dark surface in a story is a supported contrast context, not a claim that a full dark theme exists.

Accessibility references: [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) explains when boundaries are required and how inset focus contrasts with its fill; [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) defines the narrow-layout requirement.
