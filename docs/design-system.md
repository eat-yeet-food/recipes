# Eat / Yeet design system

Plum + pink is the approved identity (November 2026). Deep plum ink carries reading and actions, bubblegum pink is the brand and the selected state, and an orange accent adds heat. Avenir is for reading and controls, Geller for headings, Bowlby for the wordmark and expressive brand moments. Food photography carries the playfulness; the kitchen tools stay easy to read.

## Sources of truth

- Runtime values: `packages/l8/web/src/styles/global.css`. The **Foundations** pages in Storybook resolve these values at runtime.
- Fonts and generated Markdown styling: `packages/l8/web/src/styles/site-overrides.css`.
- Owned controls and patterns: `packages/l5/ui-primitives/src/primitives`; their colocated stories render the same components the app uses.
- Shared content patterns: `packages/l6/ui-content-blocks`; catalog cards: `packages/l6/ui-catalog`; chrome and wordmark: `packages/l6/ui-shell`.
- Feature composition: `packages/l7` (Notebook in `packages/l7/kitchen`); app-specific dough calculator: `apps/eatyeet/src/workbenches`.
- Workflow and required checks: `CLAUDE.md`; agent routing: `.codex/skills/design-system/SKILL.md`.

Run `pnpm storybook` for the interactive handbook; its **Foundations / Start Here** page is the front door and defers to this document. `pnpm test:storybook` builds it and runs every rendered story, interaction and accessibility check. This document records decisions and usage, not a second set of runtime values. Release evidence: [design-system-verification.md](design-system-verification.md) (the September yellow rollout) and `docs/changes/plum-pink/verification.md` (this rollout).

## Color

### Roles

| Role | Value | Use | Never |
| --- | --- | --- | --- |
| `ink` (= `primary`, plum 900) | `#2a0e28` | All reading text, filled primary buttons, dark panels (Your dough, phone dock, notices), Choice Group tracks, toggle outlines | Opacity-tinted secondary text |
| `brand` | `#ff7ac0` | Logo and headline stickers, the selected state, the CTA on plum, pink numbers on plum, small brand fills (avatar, Notebook disc), the reply-thread rule | Text on white (2.39:1); solid fills behind controls |
| `brand-alt` | `#ff8a3d` | Hero blob, gradient end | Text |
| `star` | `#e06414` | Filled rating stars (3.50:1 on white) | Anything else |
| `brand-soft` | `#ffe0ef` | Chips (EAT, 91% EAT) and review avatars | Surfaces holding controls |
| `tint` | `#fff0f7` | Informational asides (Callout `aside`) and History’s current row | Controls, facts, batch rows, placeholders |
| `on-dark-label` | `#ffe3f1` | Light text on plum (14.69:1) | Text on white |
| `action-hover` (plum 700) | `#4a1d47` | Hover on plum fills | |
| `muted` | `#f3ecf1` | Muted fills, image placeholders, hover rows | |
| `muted-foreground` | `#634a5f` | Secondary text (7.85:1 on white) | |
| `border` | `#ddcfd8` | Dividers and card borders on white | |
| `border-on-dark` | mix | Rules inside plum panels | |
| `input` | `#86697f` | Field and checkbox edges (4.84:1) | |
| `danger` / `danger-soft` | `#ad2939` / `#fff0f2` | Errors and destructive actions | Decoration |

The **plum ramp** (`plum-950` `#1c0819`, `900`, `800` `#3a1638`, `700`, `600` `#5a2456`, `400` `#9a4590`) feeds the roles and the hero gradient; components never use it directly. Plum 600 is the lightest plum allowed behind small pink text (4.83:1).

Measured pairs: plum on white 17.62:1, on tint 15.99:1; plum on pink and pink on plum 7.38:1; pink on plum 800 6.51:1; white on plum 800 15.54:1; white on the plum 400 flare 5.79:1; plum on orange 7.51:1; plum on brand-soft 14.40:1; danger on white 6.66:1.

### Gradients

- `gradient-hero` (`bg-gradient-hero`): plum 950 → 900 (45%) → 800 (65%) → 600 (85%) → 400. It stays dark and flares only at the far right.
- `gradient-accent` (`bg-gradient-accent`, `text-gradient-accent`): pink → orange. Used **only** by the brand stripe, the accent rule and the wordmark’s second word (pink → orange lettering on a −4° plum sticker with the orange `shadow-peel`, shimmering once on hover or tap when motion is allowed; forced-colors falls back to system text).

### The rules

- **One selected look.** Selected is always the pink fill with a plum label: Choice Group items (on a plum track), pressed Toggles (search categories, phone Filters; the Cooking view icon button is pink when pressed too; plum 1.5px outline when off, always `aria-pressed`), and the highlighted search-palette result.
- **Brand stripe.** An 8px `gradient-accent` band along the top of a white card or dialog that **asks the reader to do something**: the rating card, the public-name dialog, a standalone reply form, future confirmations. At most one per view (an inline reply form under a striped rating card gets none). Never on catalog cards, read-only panels, plum surfaces or page headers. Implemented once, by `Surface action` and `DialogContent stripe`, as a background layer so the radius clips it.
- **Accent rule.** A short `gradient-accent` line under a title: 60×3 under section headings, 64×4 under page-band titles (NOTEBOOK). Implemented once, by `AccentRule`.
- **Tint** only for informational asides and History’s current row. Controls sit on white: the Today’s batch row is white with a 1px border; image placeholders use `muted`.
- **No solid fills behind controls, and no dark fields.** Cards and dialogs that hold fields are white. There is no pink or plum container around a form.

Food photography and status red remain valid. There is no separate Learn or recipe palette and no retired alias (`warm`, `highlight`, `support*`, `secondary`, `accent`, `sidebar-*`, `brand-strong`, `action-label`, `border-light`, `border-medium`).

## Type, spacing, elevation

**Type scale.** Tailwind’s `xs`–`2xl` remain; the brand’s other sizes are named tokens: `micro` 11px, `caption` 13px, `body-sm` 15px, `title-sm` 22px, `title` 30px, `section` 34px at every width, `page` clamp(38–52px) with `tracking-title`, `display` clamp(44–80px), `hero` clamp(42–104px), `wordmark` clamp(38–80px). Mapping from the former arbitrary values: 10/11 → micro; 12.5/13/13.5 → caption; 15 → body-sm; 17/19 → `lg`; 21/22 → title-sm; 26/28 → title; 32/34 → section; 36/44/46 and clamp(28,4vw,40) → page; 64 and clamp(34,5vw,56) → display (Learn index uses page). Arbitrary `text-[Npx]` is rejected by the checker. `cn()` (`packages/l0/foundation/src/utils.ts`) declares these text, tracking, radius and shadow tokens to tailwind-merge, which otherwise reads an unknown `text-*` as a color and drops the size beside `text-ink`; the design-system check fails when that list drifts from `global.css`.

**Uppercase letter-spacing** has two steps: `tracking-eyebrow` (0.16em, eyebrows) and `tracking-label` (0.06em, uppercase buttons, breadcrumbs, meta). 2px/3px/0.14em/0.12em/1.5px/widest → eyebrow; 0.8px/1px/1.2px/wide → label. `tracking-tight` is allowed for display headlines.

**Geller weights.** Page and section titles are bold; card and dialog titles are extrabold.

**Radius by role.** `radius-control` (999px): buttons, toggles, chips, the avatar circle. `radius-field`: fields, panels, callouts, list highlights. `radius-surface`: cards and dialogs. `radius-choice` with `spacing-choice-inset`, and the derived `radius-choice-item` (outer minus inset; never set independently). `radius-filter`: checkboxes, filter rows, kbd, thumbnails. `rounded-lg`, `rounded-md` and arbitrary radii map to these. Viewport sheets have square corners (`DialogContent variant="sheet"`).

**Elevation.** `shadow-card` (sticky nav hairline), `shadow-raised` (notices, skip link), `shadow-overlay` (menus, the search palette), and `shadow-glow` (the mobile hero card only). Catalog cards are flat.

## Owned patterns

| Pattern | Owner | Rule |
| --- | --- | --- |
| Eyebrow | `typography.tsx` | Two sizes (12px, 11px), one tracking; tone by surface: `ink`, `brand` (on plum), `muted`, `on-dark` |
| PageTitle | `typography.tsx` | Every h1: `standard` (Geller bold, `text-page`) or `display` (Bowlby, brand bands) |
| SectionTitle | `typography.tsx` | h2 at `section` or `title`; `rule="trailing"` (ratings, Notebook library, Learn groups) or `rule="top"` (recipe body) |
| Breadcrumbs | `breadcrumbs.tsx` | Ordered list; last crumb `aria-current="page"`; hidden in print |
| Callout | `callout.tsx` | `aside` (tint), `danger` (alert), `notice` (plum pill) |
| Disclosure | `disclosure.tsx` | One trigger/chevron treatment with `aria-expanded`: filter groups, Recently deleted |
| Surface / AccentRule | `surface.tsx` | White card; `action` adds the stripe. AccentRule `section` / `band` |
| Toggle | `button.tsx` | Standalone pressed control (see selected look) |
| CatalogCard | `ui-catalog/cards.tsx` | The one card: recipes, articles, Notebook formulas and start cards |

## Shape and interaction

Standalone actions are pills. Selection controls use `radius-choice` outside, `spacing-choice-inset` for padding and gap, and **outer radius minus inset** for the selected item. Wrapped labels keep the same inset and inner radius.

Faceted filter lists use a compact reading rhythm: 14px Avenir labels, Eyebrow group headings, 8px between rows, 10px between checkbox and label. Omit per-option counts; show the matching recipe total above the results. Use Checkbox’s `compact` size within a clickable label row of at least 24px (`spacing-filter-row`) with `radius-filter` corners. Group headings are Disclosures that keep their expanded state and focus. `FacetGroup` in `packages/l7/search` owns this treatment for the desktop sidebar and the mobile disclosure.

**Fields** have two surfaces. The **light** default (white, 1px `input` edge, `radius-field`, plum text, `muted-foreground` placeholder, inset plum focus, a 2px `danger` edge when invalid) is for dialogs, action cards (rating, reply) and the search palette. **`underline`** (unboxed, plum value over one plum rule that thickens to 2px on focus and turns `danger` when invalid) is the standard for page forms: account settings, the Notebook editor and notes. Every field keeps a visible external label; invalid fields expose `aria-invalid` and an associated message. Select keeps native interaction and owns a plum chevron 16px inside the right edge, hidden from assistive technology.

Filled buttons use one flat surface; utility actions use a thin plum boundary around a transparent surface. Neither uses offset shadows, decorative outlines, translation on press, or underlined labels. Keyboard focus on filled and outlined controls is one inset indicator; forced colors keep the system indicator. Real prose links remain underlined. Navigation uses a real anchor (`Button asChild`).

Borderless text actions (`link`, text-sized `ghost`, `quiet-on-dark`) have zero padding, no pill, left-aligned text and a persistent underline that thickens on hover; keyboard focus adds an outward outline. Their minimum target is 24px. Disabled text actions lose the underline. Icon-only controls use an explicit icon size and keep their own target.

Button roles: `default` (plum, light label) is the one primary action; `utility` (thin plum outline) for page utilities such as History and Duplicate; `link` for quiet commands; `danger` for destructive actions. On plum surfaces, `on-dark` is the pink fill with a plum label and `quiet-on-dark` the light underlined text action. Standalone on/off controls use `Toggle`. Error-state actions use `<Button>`, never `buttonVariants` on a raw element.

Binary settings use Switch with an adjacent visible label, grouped at content width; no hover or selected row fill.

The wordmark component owns every size. App bar and footer use the text lockup alone (EAT · YEET, the second word in pink → orange lettering on the tilted plum sticker with an orange peel); the doughnut appears in the favicon and larger brand contexts. The approved favicon is the bitten doughnut with **pink icing and cream dough** (restored from the earlier pink identity); its colors are self-contained SVG values.

## Hero and shell

`HomeHero` in `packages/l7/home` renders the active app’s copy from `apps/<app>/site.yaml` via Payload. Eat / Yeet: kicker “Eat / Yeet” (pink Eyebrow), headline “SAVORY, SWEET, OR YEET” in white Bowlby with **YEET** in the pink sticker (`headlineSticker`, default the last word), the regular-weight motto “Eat the best, yeet the rest”, and a pink CTA with a plum label. The photo is the pink sprinkle donuts (`hero-donuts.jpg`, 800×1000, never upscaled) with no caption.

- **Desktop:** split photo and copy on one continuous `gradient-hero` across the whole section. The photo keeps its 4:3 frame with the slanted bottom edge; the pink dot grid sits top right; the orange blob is anchored to the section’s right edge so wide screens never show a hard cut.
- **Phone (under `md`):** a full-bleed 330px photo, then the plum headline card overlapping it by 64px, inset 14px, with corners 28/28/28/8, `shadow-glow`, the dot grid and the orange blob inside it. The section behind is white.
- One `<img>` serves both layouts and is the page’s one eager, high-priority image with real mobile `sizes`.

Navigation and footer keep their wordmark sizes and the plum sticker; nav links, Sign in and the search icon are plum. `Wordmark` in `packages/l6/ui-shell` owns this; Shell/Wordmark and Shell/Layout render the production variants.

## Search layout

`SearchPage` in `packages/l7/search` places the PageTitle and the phone Filters Toggle in one row with space between; the Toggle keeps its 44px target and exposes `aria-expanded`, `aria-controls` and `aria-pressed`. Below `lg`, expanded filters appear beneath that row and mount only while open; at `lg` and above, filters use the desktop sidebar. Category filters are a named group of Toggles. The Filters toggle may show the active-filter count; options omit recipe counts; the matching total sits above the grid.

The global search palette opens and accepts typing immediately. Its field is a light Input Group; the highlighted result is pink with plum text. The published index loads on first open with a named loading status and a retry for failures; the typed query is kept.

## Recipe layout

Print Recipe and Cooking view appear once, as 44px plum circle icon buttons (`RecipeIconAction`, `size="icon"`) to the right of the byline, hidden in print. Each has an `aria-label` and a `title`. Cooking view carries `aria-pressed` and turns pink with a plum icon when on. There is no Pin Recipe. Phones have no hover, so `CookingViewHint` shows a one-time plum note under the Cooking view button after hydration (“Keeps your screen awake and trims the page to the recipe while you cook.”, Got it, and a 44px dismiss); dismissing it or using Cooking view retires it in that browser (`eatyeet:hint:cooking-view`). Bake sheets, which carry their own header actions, never show it. Notebook bake-sheet actions (Edit formula) keep their pills on a row below.

The image-to-body gap is 32px on desktop and 24px on mobile; in Cooking view, 12px header-to-facts. RecipeFacts has no top margin. The title (PageTitle styling) and description appear once in the header, including print; Breadcrumbs and interactive controls are hidden in print. Body sections use SectionTitle with `rule="top"`; ingredient and instruction subsections use Eyebrow h3s.

Recipes always render as written. `RecipeKitchenLink` in `packages/l7/kitchen` is the only Notebook entry point: a pink flask disc and one sentence between the facts and Ingredients, hidden in print. Time rails use plum filled pills for steps that change the dough and plum outlined pills otherwise.

## Recipe ratings

`RecipeRating` sits below the recipe: a SectionTitle (`title`, trailing rule), then the rating card, a white action `Surface` with the brand stripe, a Geller extrabold title (“Rate this recipe” / “Update your rating”), five native radio stars (filled `star`, empty plum outlines; 44px targets on phones), a light review Textarea, “Posting as <name>” and a full-width plum submit. The aggregate shows the average with `star` stars and a `brand-soft` “91% EAT” chip. Reviews use `brand-soft` initials avatars and EAT/YEET chips; replies sit behind a pink left rule. The inline reply form has a light Textarea and a plum Post Reply and no second stripe. Errors use `Callout tone="danger"`.

Keyboard: Tab enters and leaves the star group, arrows change the score, Space selects; hover previews. Submission is explicit and disabled without a score or while loading or saving; save errors keep the draft; success is announced. Signed-out readers see the same striped card with a short explanation and a plum “Sign in to rate”, and each review offers “Sign in to reply”.

## Accounts

`packages/l6/ui-shell/src/account` owns sign-in UI. `AccountProvider` supplies the member and transport; pages never read the session cookie.

- **App bar.** Signed out: a plum “Sign in” nav link returning to the current page. Signed in: a 44px ghost icon button with the member’s initials on a pink **circle** (`radius-control`), opening a white `radius-surface` panel with `shadow-overlay`, name and email above 44px menu rows with a `muted` hover and inset focus. Escape closes and returns focus. The mobile menu shows the same states as a row.
- **Account pages** (`/account/sign-in`, `complete`, `settings`): white, with a PageTitle. Sign-in is one centered 440px column with a full-width plum “Continue with Google” and the Terms/Privacy note; settings uses labeled two-column rows with underline fields. Errors use `Callout tone="danger"` or an associated message.
- **Public name dialog.** New Google members confirm their public name once in a white dialog with the brand stripe (`DialogContent stripe`), a light field and a plum Save name.

Stories: Shell/Account covers the nav states, menu, name dialog, sign-in and settings.

- **Notebook** works signed out; only saving requires sign-in, which returns to the calculator with `?save=1` and opens the name step.

Stories: Shell/Account covers the signed-out and signed-in nav, menu and name dialog, sign-in (available, unavailable, Google failure, already signed in) and settings. Untested: real Google consent round trip and screen-reader review of the menu.

## Video blocks

YouTube content blocks use a labeled video title and the shared outlined “Watch on YouTube” link. They navigate to the hosted video; the reading page does not embed the third-party player. The Page Blocks stories exercise this same responsive row.

## Notebook

Notebook replaces Adjust recipe (approved October 2026, proposal variant A “Notebook”). It sits in the navigation beside Recipes and Learn. Owners: pages and shared controls in `packages/l7/kitchen`, the dough editor and results in `apps/eatyeet/src/workbenches`, routes in `packages/l8/web/src/app/(site)/notebook`.

- **Library** (`/notebook`): cards open each formula's bake sheet. A white header with no fill (`KitchenBand`): the Bowlby “NOTEBOOK” PageTitle (`display`), the band AccentRule and one muted line (“Your versions of the dough recipes. Saves as you go.”), with a Sign in link (signed out) beside a plum New formula, over a bottom border. No eyebrow, intro paragraph, local-storage callout or start-section explainer. Below it, the member's formulas grouped by dough family (SectionTitle with a trailing rule) as shared `CatalogCard`s (recipe photo on `muted`, Geller name, source recipe, facts line, Edited time), Start from a recipe cards, and a Recently deleted Disclosure with Restore. Signed-out visitors get the header, a “Saved in this browser” aside Callout and the start cards.
- **Formula editor** (`/notebook/<recipe>/<id>`, reached through Edit formula): breadcrumb Notebook › name › Edit; the formula's name is the h1 (a `FormulaTitle`, renamed in place), “From <recipe>” and the Saved label. Header actions are utility History and Duplicate and a filled Bake sheet. A “Changed from the recipe” strip lists every difference as chips (label, struck-through old value, bold new value) with Reset to recipe. It sits with the dough results (below “Your dough” in the sticky panel; inside the expanded dock on phones, whose bar adds “· N changes”), never above the controls, so a change never moves the page. The editor is a page form on white: standard underline fields (`NumberField surface="underline"`, `Select surface="underline"`), section headings in bold Avenir, compact ChoiceGroup (44px, matching the fields) for input mode, oven and mixing, danger icon buttons for removing flour and fold rows. The plum “Your dough” panel (pink title, total and schedule times, `on-dark-label` rows, tabular weights right) stays sticky beside it at `lg`, with the changes strip and Recent changes below. Below `lg` the results dock to the bottom as a plum bar with a pink total (total, batch and a Bake sheet action) that expands to the full panel. Notes and Delete formula (danger) close the page.
- **Calculator** (`/notebook/<recipe>`): the same layout for anyone, titled by the recipe (renameable; the name stays in this browser until saved), with the label “Unsaved · kept in this browser” and a filled “Save to Notebook”. Saving never requires an account: signed out, formulas save in this browser (“Saved in this browser”), the library says so with a Sign in link, the formula editor carries a “Saved in this browser” aside Callout, and signing in moves them to the account with a “Moved N formulas…” notice.
- **Saving**: there is no Save button on a formula. Edits autosave (800ms debounce) with the revision they started from. The Saved label reads Saving…, Saved · time, “Not saved · fix the highlighted values” while fields are invalid, or a danger message with Try again; a failed save never claims success and keeps the edits. A 409 from another tab asks for a reload.
- **Naming**: no dialog. `FormulaTitle` is the page h1 on the calculator, the formula editor and a saved bake sheet: click the name or the pencil, type, Enter or click away to save; Escape or an empty field keeps the old name; a taken name stays in the field with the reason in `danger` below and focus kept. Save and Duplicate never ask for a name: Save uses the typed name or the recipe title, Duplicate uses “<name> copy”, and the server takes the next free variant (“… 2”). A copy opens with its name selected. Names are 1–80 characters after normalization and unique per member regardless of case.
- **History**: a white full-height sheet (square corners) listing versions newest first, grouped by day, each described by what changed from the previous one; the current version sits on `tint`. Restore is a text action and adds a new version, so it can be undone from the confirmation.
- **Notices**: plum pill (`on-dark-label` text, `quiet-on-dark` Undo) at the bottom (raised above the phone dock) with a quiet Undo and a dismiss icon; failures use `danger`. Delete returns to the library with Undo; deleted formulas stay in Recently deleted for 30 days.
- **Bake sheet** (`…/bake`): a saved formula's home page, where library cards, recipe-page links and Save land (Save adds a “Saved to Notebook” notice). The recipe rendered through `RecipeArticle` with the formula's numbers, titled by the formula and renameable in place, with Edit formula, Print and Cooking view but no Pin. A “Making N today” row, white with a 1px `border`, with a 44px stepper changes today's batch only (`?count=`), never the formula. The fixed app bar is hidden in print.

On phones the dough totals live in one bottom sheet (`DoughDock`), never a separate bar plus drawer. It rests at its own lowest height (grab handle, 44px summary button and Save) without dimming the page; the page reserves exactly that measured height (`--dough-dock-peek`) so the footer ends right above it. The same sheet follows a finger dragged up or down and settles at rest, half (60%) or full (94%), or one height further in the direction of a flick; tapping the summary toggles rest and half, and Escape or tapping the dimmed page returns it to rest. At full only the header drags it, because the list scrolls by touch. It sits on the nav layer, above the site header and below dialogs. It is a non-modal disclosure (the list is `inert` at rest), so the page stays available to assistive technology; Vaul is unsuitable because it always renders a modal dialog. Results render `docked` there, without their own visible heading and total.

Keyboard: every control is native; the name field saves on Enter and cancels on Escape, returning focus to the Rename button; the History sheet traps focus and close with Escape; the dock toggle exposes `aria-expanded`. Flour rows carry their blend in their accessible names (“Starter Bread flour percentage”) so dough and starter rows never share a name. Stories: Features/Notebook/Controls (save states, changes strip, rename in place, History, stepper, notices) and Features/Notebook/Pages (library signed in and out, calculator, sourdough with an invalid blend, formula autosave, bake sheet). Untested: real-device touch on the dock, screen-reader review of History grouping, and the Google round trip before `?save=1`.

## Sourdough process

The sourdough plugin owns Mixing and fermentation controls, backed by `SourdoughProcess` in the recipe domain (approved November 2026, “Simpler sourdough schedules”). The section is one page form with three titled groups (Eyebrow over a `border` rule): **Before bulk**, **Folds**, and **Bulk and shaping**, after a compact ChoiceGroup for hand/spiral mixing.

- **Optional rests.** Autolyse and Fermentolyse are labeled `Switch` rows with a 13px hint and one duration field while on. Off stores 0 minutes (`autolyseMinutes`, `saltDelayMinutes`); turning one back on restores its last length in the session, else the recipe's. A zero rest removes its recipe step and merges its mixing into the neighboring step; with both off the first bulk step mixes flour, all of the water, levain and salt.
- **Fold groups.** Folds are edited as groups (technique Select, sets, every) plus “First fold after salt”. `foldGroups`/`foldsFromGroups` read and write the stored `folds[]` exactly: consecutive folds with one technique and even spacing form a group; irregular schedules become several groups without moving any fold. Groups keep existing fold IDs and mint IDs only for added sets. A muted line under each row lists its fold times. Removing a group focuses the next group or Add folds.
- **Durations.** `DurationField` is one underline text field accepting 90, 1:30, 1h30, 1h 30m or 45m and showing compact durations (30m, 1h, 1:30h) after editing. Invalid text stays visible with “Use minutes (45) or hours:minutes (1:30).” and blocks saving like any NumberField.
- **Bulk.** Dough temperature, “Into the refrigerator at”, “Preshape rest” and “Shaping rest”; `benchMinutes` is their sum, `preshapeMinutes` the first, and dividing is derived (`bulkMinutes = refrigerator − bench`). The temperature estimate is a single 13px muted hint line under that row (polite live region, describing the refrigerator field) with optional “Use …” text actions, never a tint callout between fields. One source line closes the section.
- **Schedule.** The plum “Your dough” panel lists the bake (Before, 0m, salt, fold groups, divide and preshape, shape, stitch and refrigerate) with pink tabular times; folds after dividing show as a `danger-soft` row explaining the fix.

Recipe content binds autolyse, bulk, and levain section IDs explicitly; the plugin produces matching instructions, levain build amounts, equipment, learning method, and total-time adjustment. Bulk steps carry structured `itemTimes` (render-time only, never stored) and `RecipeList` renders them as a **time rail**: a 64px column of pill markers (compact durations, tabular Avenir Bold) on a 2px `border` rule, filled plum for steps that change the dough (levain, salt, divide, refrigerator) and outlined otherwise, with the rest length (“Cover at 75°F for 15m.”) in muted text below each step and a “Time since mixing in the levain” legend. The rail runs through dividing and preshaping, shaping, and refrigerating; when the recipe binds its Shape section (`processSections.shape`), the rail replaces that section and uses its last item as the refrigerate step. Machine-specific speeds and mixing durations come from the recipe’s typed `spiralMixer` configuration (Ooni Halo Pro: 165 RPM initial, 90 RPM salt, 165 RPM finish).

## Pizza process

Pizza's Notebook section, “Mixing and fermentation”, stays as small as sourdough's: a compact `ChoiceGroup` for Spiral mixer, Food processor or By hand, then a “Fermentation” group with Dough temperature, “Divide and ball at”, a compact 2/3/4-day “Cold ferment” choice and Warm-up. Choosing days sets the warm-up (4h, 3h, 2h), which stays editable. For one or two balls, a one-line muted hint offers “Use food processor” as a link button. Times count from the start of mixing, so dividing happens at the same time for every method; by hand, the 20m covered rest before kneading counts toward bulk. Formulas without a schedule use the recipe's (`DEFAULT_PIZZA_PROCESS`: spiral, 76°F, 1h, 2 days, 4h). The recipe and bake sheet put the dough steps on the time rail (“Time since you start mixing”), rewrite the mixing step for the method, set the refrigerator days and bake-day warm-up, and drop the spiral mixer from equipment for other methods. The resolver reads stable item IDs and leaves a dough section it does not recognize as written. Recommended oven formulas compare dough values only, never the schedule.

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
| Autolyse, fermentolyse, fold intervals, refrigerator and shaping times | One duration field; compact display (45m, 1h, 1:30h) |

The editor registers incomplete/invalid fields and pauses autosave and Save until they are resolved. Previews use the last valid numbers and explain that state. Quantity, piece weight, and total dough weight are linked; total weight changes the piece weight without changing the count. Ingredient-weight drafts remain independent of the percentage conversion so temporarily invalid flour totals cannot erase the other weights. Reset to recipe, Restore and reloading reset text drafts to the stored values. Switching calculator modes replaces that mode’s numeric fields. Flour row identities stay stable when names are edited, preserving focus and starter ingredient identity.

The production field and Features/Notebook/Pages stories cover clearing/replacing every numeric field, decimal commas and precision, invalid integer counts, direct total-weight edits, and flour-name focus. Real-device keyboard behavior still requires coordinated mobile review; do not infer it from a desktop build.

## Control contracts

| Component | Use and states | Keyboard / semantics |
| --- | --- | --- |
| Button | `default`, `utility`, `ghost`, `link`, `on-dark`, `quiet-on-dark`, `danger`; disabled; long label | Native button; `asChild` with a real anchor for navigation; 44px filled/outlined target, 24px minimum text action |
| Toggle | Off (plum outline), on (pink fill), with icon, in a named group | Native button with `aria-pressed`; Space/Enter toggle |
| ChoiceGroup | Exclusive selection; plum track, pink selected item; `compact` (32px options, 44px overall) beside page-form fields | Named group of pressed buttons; Tab, Enter, Space; `aria-pressed` |
| Input / Select / Textarea | Light (default) and `underline`; filled/empty, invalid, disabled, read-only | Visible associated label; `aria-invalid` and `aria-describedby`; NumberField for editable numbers |
| Input Group | Light field with inline addons (search palette) | The group owns the edge and focus; inner input is borderless |
| Checkbox | Checked, unchecked, disabled, focus; default and compact | Radix semantics; visible check beyond color |
| NumberField | Blank/partial, integer, decimal, comma decimal, invalid, external reset | Text input with numeric keypad; retained edit text and inline errors |
| Switch | On/off, disabled, focus; external label, white surfaces only | Radix switch, `aria-checked`, Space toggles, 44px hit area |
| Dialog / sheet | `stripe` for action dialogs; `sheet` for History | Named dialog, Escape, contained focus, return to trigger |
| Disclosure | Filter groups, Recently deleted | `aria-expanded`/`aria-controls`; Enter/Space |
| Faceted filter list | Compact rows without counts, wrapped labels, open/closed groups | Whole label toggles; 24px targets |
| RecipeFacts | Unfilled strip with thin `border` rules, 12px muted labels, 18px semibold values | Passive definition list |
| Dough summary | Plum panel, pink totals, labels left, tabular weights right | Definition lists; explicit errors |
| Account menu | Sign in link, initials trigger, panel, sign-out error | Disclosure button; Escape restores focus |
| Notebook | Library, calculator, formula autosave states, changes strip, History, bake sheet, phone dock | Saved label is a polite status; Undo notices announced |
| Content blocks | Markdown, media, callouts (aside Callout for every authored tone), steps, comparison, sources | Real heading hierarchy; table scroll local |

## Story ownership and coverage

The handbook is ordered Foundations (Start Here, Color, Typography, Spacing & Radius, Elevation & Motion, Gradients & Accents, Iconography) → Primitives → Patterns → Shell → Features (Home, Recipes, Learn, Search, Notebook) → Pages. Titles are Title Case; story names describe states, never decisions or colors.

Stories live beside their owner. The exceptions are Features/Home/Brand Hero, Features/Notebook/Pages and Pages, in `packages/l8/web/src/stories`, because they compose the active app's configuration and registries (`@app/*`), which only web composition may import. Storybook wrapper styles target only wrapper nodes, never descendant controls. Every component page opens with when to use it, when not to, and its variants by role. Notebook stories use in-memory account and kitchen transports; route tests cover what a small canvas cannot.

When adding a component, document purpose, variants by role, token roles, keyboard and ARIA behavior, long labels, narrow layouts and owner, and add its story in the same change. The design-system checker fails on primitives without a story.

## Accessibility and release contract

Target WCAG 2.2 AA across the rendered app and handbook. Normal text needs at least 4.5:1; qualifying large text 3:1; visual control/state cues need 3:1 against adjacent colors where required for identification. Check actual text, fills, opacity, focus, selected, error, and hover states, not just tokens. Labels and explicit messages carry meaning beyond color.

Prefer 44px action targets and meet the 24px minimum target rule or its spacing exceptions. Verify 320 CSS-pixel reflow, text spacing, browser zoom, keyboard-only operation, no obscured focus, reduced motion, forced colors, and representative screen-reader flows. Dialogs must restore focus and keep mobile controls reachable. Automated checks cannot certify complete conformance.

- `pnpm test`: unit, build/type/boundary, routing/recipe behavior, rendered Storybook checks, design policy.
- `pnpm test:a11y`: app axe checks, including Learn and Notebook pages, dialogs and History; all WCAG impact levels fail.
- `pnpm test:lighthouse`: accessibility and SEO budgets.
- `pnpm shots`: desktop/mobile app specimens, Learn and Notebook included.
- `pnpm parity`: compares the reviewed visual baseline and writes differences; baseline changes must be deliberately reviewed, never silently accepted.

A visual update must ship component and story changes together. Inspect screenshots and document remaining manual checks. A Storybook build alone is not verification. Token drift is checked by `scripts/check-design-system.mjs`, including negative fixtures for retired colors and raw UI values. The checker also rejects arbitrary type sizes and letter-spacing, `var(--color-*)` escapes, opacity-tinted ink text, retired aliases, hand-rolled pills, stripes and accent rules, dark fields, primitives without stories and `TextSelect`. Rendered checks protect plain filled/outlined labels, underlined unpadded text actions, concentric selection geometry, square viewport sheets, text-only navigation and fully edged light fields. Status red and food-photo colors remain valid.

## Plum + pink rollout

The November 2026 rollout replaced yellow + ink in one pass: tokens, primitives, patterns, every screen, this document, the skills and the handbook. It removed the solid brand containers around forms and the dark field default, retired the color-named aliases and variants (`on-ink`, `action-label`, `brand-strong`), removed the unused `TextSelect`, and introduced the named type, letter-spacing and elevation scales. Behavior contracts (numeric editing, Notebook, sourdough and pizza process, accessibility) are unchanged. The Payload admin keeps Payload's own theme. The site supports light mode only; a plum surface in a story is a supported contrast context, not a dark theme.

Accessibility references: [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) explains when boundaries are required and how inset focus contrasts with its fill; [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) defines the narrow-layout requirement.
