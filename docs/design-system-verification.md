# Yellow + ink release verification

Reviewed September 7, 2026. The approved usage contract is [design-system.md](design-system.md); runtime tokens and production components remain the implementation source of truth.

## Subsequent September 7 refinements

The current contract also includes text-only footer branding, the shared mobile search title/filter row, regular-weight hero motto, revised app-owned kicker, removal of the supporting hero tagline, compact filter rows and checkboxes, and omission of per-option recipe counts. The docs and production stories reflect these changes; the new filter geometry appears in the token handbook.

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
