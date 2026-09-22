# Public recipe ratings — September 21, 2026

Recipe headers now show an actual public average/count and an underlined rating action. The dialog supports one through five stars, keyboard selection, explicit submission, updating a browser's existing vote, cancellation, loading, retry and saved feedback. The supplied Butternut Bakery recipe informed the initial compact stars/summary pattern. After feedback, the local Yeet project's star picker and display informed gold star fills, quieter labels, an EAT/YEET score cue, and a simpler dialog with one full-width primary action.

Ratings are independent of Git-authored recipe data. The additive Payload migration creates a separate collection with a unique recipe/visitor key. The public API returns aggregate values and the requesting browser's score, never voter identifiers. An internal Symbol capability restricts the collection's Local API access, with `overrideAccess: false`; raw Payload REST and admin do not permit rating reads/writes. The endpoint validates fresh publication, origin, JSON size and integer range. A private/no-store response and an API-scoped HttpOnly cookie keep visitor state out of cached recipe HTML.

Identity is anonymous and browser-specific. Clearing cookies or changing browsers allows another vote; this does not claim verified-person deduplication or bot prevention. Aggregate reads paginate stored votes, so high-volume use will need aggregate and rate-limit infrastructure. No contact information, IP addresses, comments, or fabricated SEO ratings are introduced.

## Initial verification (before the refinement below)

- Generated and inspected the tracked migration; applied it to existing local state and to the fresh isolated integration database.
- `pnpm test`: design policy, units, remote policy, boundaries, TypeScript, production build, utility coverage, isolated content/security/rating integration, HTTP/SEO checks, 37 interaction checks and 134 recipe checks passed. The first rendered Storybook run exposed asynchronous assertions in the new stories; those were corrected.
- Subsequent `pnpm test:storybook`: all 14 rating story/viewport combinations passed. The remaining suite failure was `aria-prohibited-attr` inside the external YouTube iframe's `#movie_player` in an existing content-block story (193/194 combinations passed).
- `pnpm test:a11y`: 39 page/state checks passed at 1366, 390 and 320 pixels. `pnpm test:security`: no known vulnerabilities.
- Rebuilt and typechecked the final read-refresh/error-recovery refinements successfully.

- `pnpm test:lighthouse`: three runs on each of six routes; all accessibility/SEO medians were 100, performance medians 90–100 and CLS at most 0.0031. Five routes met all budgets. Recipe detail missed LCP at 3.535 seconds (target 2.5 seconds), so the command exited 1. Earlier local evidence in `review.md` also recorded recipe LCP above budget; this is not a controlled before/after comparison or production measurement.
- `pnpm shots`: all 15 captures completed without page errors. Reviewed the recipe desktop capture, mobile baseline/current/diff, and live header/dialog at desktop, 390px and 320px. The dialog fits without horizontal overflow, selection and focus remain visible, and Cancel/Escape discard the draft and return focus to the rating action. Tab stays within the open dialog; arrow keys select stars. Reopening refreshes the stored vote.
- `pnpm parity`: 2/15 matched. Differences include the intended rating row and older baseline drift in existing hero, search, workbench, recipe content and controls. Baselines were not replaced. The prior mobile recipe baseline still has filled actions and Start Cooking, whereas source before this change already used outlined Pin/Print and the Cooking view switch.
- Final `pnpm boundaries`, `pnpm typecheck:ts`, `pnpm build` and `git diff --check` passed. Persistence/security integration and story save tests ran against isolated data; manual preview review cancelled drafts and did not seed public-looking local votes.

These initial results identified the third-party YouTube accessibility attribute, recipe LCP budget and existing visual-baseline differences for follow-up. No deployment is included.

## Follow-up changes

- YouTube blocks now present the video title and an accessible “Watch on YouTube” link, removing the externally controlled iframe that caused the axe violation.
- Calculator projection/validation remains synchronous for server-rendered recipes and shared URLs. The calculator UI loads only when opened, with the same viewport sheet while loading. Browser and story checks wait for the loaded controls before asserting their contents.
- AVIF pipeline v5 adds a 720px step and uses quality 35 after side-by-side image review. The mobile pizza request falls from an 800px, 40,585-byte image to a 720px, 16,467-byte image. Local content/media sync retains old objects. Web font derivatives omit hinting instructions while retaining glyph outlines, metrics, character coverage, and all previously retained OpenType features; original fonts are unchanged.
- The shell fetches its search index from the existing public recipe API only when search opens. The input remains immediately usable, preserves typing while loading, and supports retry. The recipe sidebar receives only its four suggestions; unused search text is omitted from recipe-page props. Search data no longer inflates every recipe document.
- Recipe projection reuses calculated dough values, skips substitution work for instructions without placeholders, and reuses number formatters. Rendered values and precision remain unchanged.
- Pin URLs acquire the browser URL after hydration, eliminating the local-origin hydration mismatch.
- Full-page screenshot capture now scrolls through the page and waits for visible image elements to load. The previous captures incorrectly retained unloaded native-lazy images below the fold.

## Final verification

- `pnpm test` passes: design policy, units, remote policy, infrastructure types, package boundaries, TypeScript, production build, compiled utilities, isolated content/security/rating integration, HTTP/SEO, 40 browser interaction checks, 134 recipe checks, and 99 Storybook stories at two widths (198 checks).
- `pnpm test:a11y` passes all 39 page/state checks. `pnpm test:security` reports no known vulnerabilities.
- `pnpm test:images` verifies the selected 720px mobile hero, reserved dimensions, successful image responses and no duplicate hydration downloads. Original source images/fonts remain unchanged.
- `pnpm test:lighthouse` passes all six routes, with three mobile production-preview runs per route. All accessibility and SEO medians are 100. These are local lab results, not production CDN measurements.

| Route | Performance | Median LCP | CLS |
| --- | ---: | ---: | ---: |
| `/` | 100 | 1.787 s | 0.0030 |
| `/recipes` | 100 | 1.704 s | 0.0002 |
| `/browse` | 100 | 1.621 s | 0.0011 |
| `/learn` | 100 | 1.699 s | 0.0002 |
| `/recipes/new-york-style-pizza` | 97 | 2.479 s | 0.0010 |
| `/learn/mixing-dough-and-gluten-development` | 99 | 1.835 s | 0.0002 |

`pnpm shots` captured all 15 views without page errors. Reviewed old/current/diff images across home, browse, search, Learn, recipe and calculator views, including mobile. Updated the baselines for the intended rating row, reviewed image/font derivatives, and previously approved source changes that the old baselines lacked. Full-page captures now include all below-fold images. A fresh `pnpm parity` run matched all 15 baselines exactly. Final live preview inspection confirmed the gold-star dialog and EAT score cue; Escape discarded the draft and restored focus to “Rate this recipe,” with no vote submitted. `git diff --check` passed.

## Accessibility review limits

Rating-story axe incompletes are the isolated canvas's page-level bypass check and Radix modal focus guards/background `aria-hidden` checks. Keyboard submission and focus restoration are covered by the production-component play function. Existing app/handbook incompletes also include content contrast and composite-widget checks; these remain in the generated reports and are not represented as a complete screen-reader certification. Real-device touch and screen-reader review remain manual.
