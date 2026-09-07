# Yellow + ink release verification

Reviewed September 7, 2026. The approved usage contract is [design-system.md](design-system.md); runtime tokens and production components remain the implementation source of truth.

## Subsequent September 7 refinements

Recipe image-to-body spacing is now 32px on desktop and 24px on mobile, replacing stacked main padding, article margin, and article padding. Standalone visual checks remain paused.

The recipe body no longer repeats the Recipe eyebrow, title, and description below the image or in Cooking view. The main page header is the single owner of that introduction; body sections now use level-two headings with level-three subsections. Standalone visual/accessibility checks remain paused.

Yeast now has an explicit two-decimal exception for its percentage, saved summary, gram field, preview, and applied ingredient amount. The whole-gram rule still applies at 20g and above, and trailing zeros are omitted. Existing production stories include a 0.25% example; standalone checks remain paused.

The sourdough plugin now uses the author’s Ooni Halo Pro process: cool water, initial 165 RPM for about 4–5 minutes to 70°F, salt incorporation at 90 RPM for 1 minute, then 165 RPM for about 4 minutes. RPM mappings are supported by Ooni’s [40% / 165 RPM example](https://ooni.com/blogs/recipes/fluffy-marshmallows-using-ooni-halo-pro) and [15% / 90 RPM dough recipe](https://nz.ooni.com/blogs/recipes/ooni-neapolitan-style-pizza-dough). Recipe configuration owns the machine profile; hand-mixing instructions remain separate. Standalone checks remain paused.

Saved formulas now starts collapsed behind a compact count-bearing disclosure. The existing save/load/edit/delete stories open that disclosure explicitly; hidden form state is retained when collapsed, and storage failures remain visible. Standalone interaction and visual checks remain paused at the user’s request.

The follow-up precision contract is whole grams at 20g and above, at most one decimal for smaller weights and all percentages/ratios, and no trailing `.0`. It covers fields, previews, saved summaries, applied ingredients, and formula bindings. Typed buffers and raw calculations remain separate. Formatter, domain, and production-story assertions have been updated but not executed during the standalone-check pause.

Sourdough now has family-specific name/help copy and one saved-formula workflow containing starter/levain settings and the modeled mixing/fold schedule. The domain validates whole-minute, ordered folds; the plugin carries them through saved/default/shared state and resolves bound recipe steps, equipment, learning method, and total time. Existing standalone starter records remain in storage without a second naming UI. Added domain and story regressions cover malformed timing, hand mixing, save/load, legacy shared state, and recipe projection. Standalone unit, Storybook, mobile, accessibility, screenshot, and Lighthouse checks remain paused at the user’s request; deployment build/smoke checks do not establish those results.

The numeric-editing repair replaces coercion/clamping on every keystroke with shared editable text buffers, decimal/numeric mobile keypads, retained invalid text, and Save/Apply gating. Total dough weight is now directly editable; independent ingredient-weight drafts preserve values during invalid conversions. Flour-name edits keep stable identities and focus. New primitive and whole-workbench interaction stories cover clear/replace, comma decimals, integer errors, total-weight edits, and all visible numeric fields. These standalone stories, mobile Safari/Chrome keyboard behavior, and physical-device focus/scroll behavior remain unverified during the user-requested check pause; deployment build and production smoke verification do not establish those results.

Cook Mode now aligns to the recipe action grid’s right edge, matching the Your recipe box below, including stacked mobile rows. Its label spacing is unchanged. The card story uses the same grid arrangement; standalone checks remain paused.

Responsive recipe headers now reserve the entire narrow row for the title and place Cooking view beside the byline; wide headers retain the switch beside the title. Pin/Print no longer grow across the mobile row, and their icons remain visible. Phone, intermediate-width, and long-title stories render the production header. Standalone visual checks remain paused; these layouts have not received new screenshot baseline approval.

The “Your recipe” label uses the actual bold action font. Formula Save/Update now exposes the shared disabled appearance while invalid, with inline reasons before submission. The duplicate-name/value stories and a disabled-on-ink specimen reflect this behavior; standalone verification remains paused.

Borderless text actions now use zero padding, a persistent underline, no hover fill, and outward keyboard focus. Recipe adjustment, formula actions, error-page navigation, and Clear all share this treatment. Icon-only actions retain explicit target sizes; filled and outlined actions retain plain labels. Updated stories cover long labels on yellow, ink-panel actions, ghost text, disabled text, and icons; rendered assertions distinguish these contracts. Standalone checks remain paused at the user’s request; these new assertions and visual states have not been run or accepted as baselines.

The current contract also includes text-only footer branding, the shared mobile search title/filter row, regular-weight hero motto, revised app-owned kicker, removal of the supporting hero tagline, compact filter rows and checkboxes, and omission of per-option recipe counts. The docs and production stories reflect these changes; the new filter geometry appears in the token handbook.

Recipe facts subsequently changed from a rounded yellow panel to an unfilled strip with thin rules, smaller semibold values, muted labels, and responsive columns. Its production stories include the full long-duration pizza example. This refinement has not undergone automated or browser review; standalone checks remain paused at the user’s request.

Later refinements add the shared ink WorkbenchPanel for saved formulas and dough results, normalized-name and exact-formula duplicate prevention, explicit create/update forms, surface-specific dividers, article-header utility actions, and dedicated labeled switches. New stories cover name validation, duplicate formulas, renaming, both recipe action contexts, switch keyboard interaction, and fields/actions on ink. These stories and updated route assertions have not been executed during the requested pause; keyboard, narrow-layout, storage-failure, and visual review remain pending. Deployment’s build and production checks are separate from that outstanding review.

The next layout refinement gives selects an inset caret, makes recipe subsection headings bold, adds a thin ink boundary to compact header actions, places Cooking view beside the title, tightens switch-label spacing, and removes the recipe body’s extra horizontal inset. Production stories and the handbook reflect these changes. Standalone visual and accessibility checks remain paused; no new baseline acceptance is implied.

Follow-up changes keep horizontal geometry stable when Cooking view toggles, give its header label a 12px gap while retaining 8px in the recipe card, and expose Delete directly for the saved-formula picker’s chosen entry. Regression assertions and a delete-without-loading story describe the intended behavior; they remain unexecuted during the standalone-check pause.

The automated evidence below describes the original Yellow + ink rollout, not full verification of these later refinements. Standalone checks were stopped at the user’s request because another agent was working in the same workspace. No new visual baselines were accepted. The later compact-filter changes and updated hero copy still need a coordinated screenshot, keyboard, narrow-layout, and accessibility review. The standard deployment command performs its own build and production verification; it does not replace that review.

## What was reviewed

The pizza-led “Big dough energy” home hero, text-only app bar, yellow-icing/golden-orange-dough favicon, recipe and Learn reading surfaces, saturated category choices and recipe facts, flat ink fields, square workbench sheet, and aligned ink dough summary. Buttons have plain labels and no decorative drops or bottom edges. Keyboard focus remains visible.

Fifteen app screenshots cover home, browse, search, recipe listings and articles, Learn, and the open workbench at desktop/mobile sizes, including its scrolled result summary. Previous/new images and available pixel differences were inspected before replacing baselines. The older baseline also predated existing recipe ordering and content updates. Baseline changes are an intentional record of the reviewed current app, not evidence that this release changed recipe data.

## Automated evidence

- `pnpm test`: passed. Design-policy fixtures, unit tests, build/class/type/layer checks, SEO, 37 interaction checks, 135 recipe checks, and 46 rendered stories at 1280 and 390 pixels.
- Storybook runs real play functions, waits for their resulting UI states, and fails on console/play errors, WCAG violations, overflow, underlined buttons, nonconcentric selection radii, rounded viewport sheets, navigation icons, or field bottom edges.
- `pnpm test:a11y`: passed all 39 app page/state checks at 1366, 390 and 320 pixels, including populated/empty search palette and open/scrolled workbench. Every WCAG impact level fails. Full violations and incomplete results are saved in `dist/app-a11y.json`.
- `pnpm test:lighthouse`: accessibility 100 and SEO 100 on all six checked crawlable routes. This is not a performance-budget test.
- `pnpm parity`: 15/15 exact matches against the explicitly reviewed baselines. Differences are written to `dist/diff`.

## Manual findings and limits

Keyboard checks exercised the workbench through 45 successive Tab presses, Escape, and return to its trigger. Narrow layouts were checked at 320 CSS pixels with increased line, letter, word and paragraph spacing. Forced-color focus was inspected. Native input/select/checkbox semantics are retained.

Image-dependent browse-label contrast was replaced with solid ink beneath cream labels (14.51:1). Invalid fields use a status fill with light text and inset light focus, avoiding a low-contrast red focus indicator on ink. Selected search titles, metadata and the view-all action now inherit the selected high-contrast treatment. Recipe action containers have explicit group roles.

Axe incomplete findings were investigated rather than counted as passes: isolated stories lack full-page bypass landmarks; the actual app supplies a skip link and main landmark. Wordmark transforms and clipped/overlapping scroll content need visual contrast review. Radix focus guards and hidden page content need keyboard containment checks. An initially empty search listbox gains its required option/group children when queried; populated and empty-result interactions are covered separately.

Automated results are not a WCAG certification. A complete VoiceOver/NVDA audit and a physical-device/browser matrix were not performed in this release. Future releases must preserve the same checks and record additional manual coverage explicitly.
