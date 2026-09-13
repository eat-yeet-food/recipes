# Required follow-up: page and image loading regression

Status: **open, required**. On 2026-09-13 the owner reported that page and image loading had become noticeably slow after the migration, called this a regression, and required it to be addressed after production deployment. Deployment authorization and temporary acceptance exceptions do not resolve this work.

## Baseline evidence

The current remote baseline is staging application commit `3f3da9b25244b7623c6a4232ab122bc233c7cff6`. Each row is the median of three Lighthouse mobile runs through staging's required Cloudflare Access protection. These measurements are not production measurements.

| Route | Performance | LCP | CLS |
| --- | ---: | ---: | ---: |
| `/` | 88 | 3454 ms | 0.0030 |
| `/recipes` | 95 | 2626 ms | 0.0002 |
| `/browse` | 77 | 4544 ms | 0.0011 |
| `/learn` | 96 | 2478 ms | 0.0194 |
| `/recipes/new-york-style-pizza` | 97 | 2334 ms | 0.0005 |
| `/learn/mixing-dough-and-gluten-development` | 94 | 2956 ms | 0.0002 |

Ignored evidence: `dist/remote-performance.json` and `dist/staging-browse-debug.json`. Preserve comparable copies before rerunning; these filenames are overwritten by measurement tools.

The Browse diagnostic transferred approximately 790 KiB. It observed a 307 followed by a 200 for the document, 640-pixel AVIF resources in approximately 184-pixel-wide cards, and several font/JavaScript downloads. The selected LCP image was already discoverable in initial HTML, eager, preloaded and high priority. Its raw trace and Lighthouse's simulated mobile LCP are different measurements; do not mix them to claim a speed improvement. Lighthouse's oversized-image estimates are leads, not verified savings at the user's device pixel ratio.

The image pipeline already generates 160- and 320-pixel variants. Investigate the gap from 320 to 640 against actual CSS size/device pixel ratio before changing `sizes` or derivative widths. Never shrink `sizes` dishonestly to make an audit pass. Staging Access and owner-cache exclusions also differ from anonymous production delivery; quantify that overhead separately without weakening authentication or publication checks.

## Work required after cutover

1. Capture production cold and repeat loads on the representative routes, plus client navigation, image appearance and scroll loading. Record release/content generation, browser/device/viewport/DPR, network throttling, selected image URLs/dimensions/bytes, request timings, response/cache headers, hydration downloads and redirects.
2. Compare with the retained pre-migration Pages deployment under equivalent conditions. Identify the causes of additional time or bytes: Worker admission/control reads, Payload initialization, public projection cache hits/misses, image eligibility/storage/cache reads, responsive selection, fonts, HTML/RSC payload and client JavaScript. Use traces rather than guessing from the score.
3. Fix the measured bottlenecks while preserving the approved design, content, stable IDs, formula saves, responsive image sharpness and all security/publication/maintenance rules. Keep originals private and retain compatible old derivatives. Pipeline changes require content-addressed versioning and normal release synchronization.
4. Verify the actual change with before/after mobile medians and image delivery reports. At minimum every representative route must meet performance ≥90, LCP ≤2500 ms and CLS ≤0.1. Also verify fast repeat visits/navigation and prompt image appearance; passing a score alone does not address the reported experience.
5. Run applicable repository checks and deploy the fix through staging and production. Record production results, remaining limitations and the owner's review. Close this issue only when the regression has been addressed, not when the initial cutover or an exception succeeds.

## Production baseline and optimization work (2026-09-13)

Production cutover completed with application `8df398195b929e9503e4f74ae2e98feb5bf700b6`, release `8df398195b92-1789307349954`, content generation `d163c657-4cf2-4836-8c0a-53b97a7fcf11`. Recovery enrollment is complete. Post-cutover Worker verification passed, but all six production mobile LCP medians failed the 2500ms target:

| Route | Performance | LCP | CLS |
| --- | ---: | ---: | ---: |
| `/` | 83 | 4720 ms | 0.0030 |
| `/recipes` | 83 | 4516 ms | 0.0002 |
| `/browse` | 82 | 4922 ms | 0.0012 |
| `/learn` | 84 | 4404 ms | 0.0002 |
| `/recipes/new-york-style-pizza` | 88 | 3794 ms | 0.0008 |
| `/learn/mixing-dough-and-gluten-development` | 83 | 4373 ms | 0.0002 |

The preserved production report is `.local/remote/performance-production-before/remote-performance.json`. A separate homepage diagnostic is `home-lhr.json` in that directory: approximately 211KB uncompressed HTML, an 800px hero AVIF of 40,585 bytes, and roughly 1421ms image request duration. Its observed LCP breakdown is diagnostic evidence, not another comparable three-run median. The document trace includes a 307 followed by a 200 at the same HTTPS URL; do not silently attribute that redirect to application code.

Implementation in progress:

- Completed public projections use a bounded 4MiB/128-entry per-isolate cache, then the OpenNext regional cache, then its private R2 store. The namespace includes schema, environment, release and content generation. Only completed JSON values are retained, with independent copies per caller; missing values, failures and oversized entries are excluded. No request objects or cross-request I/O promises are retained.
- The uncached Worker guard remains before all projection reads. Generation changes select new entries after synchronization, retirement, restoration or rollback. HTML remains dynamically rendered and non-cacheable. Owner/draft/preview/session handlers do not use this public cache.
- Payload service initialization happens only on a projection miss. Routes fetch article lists only when they need them. The shell receives only its navigation/name/wordmark fields.
- Published derivatives have a narrow Worker path that reads the Payload media table with a parameterized `public = 1` query and validates the requested variant before any cached bytes. This avoids Next/Payload initialization for public image traffic while keeping the publication check fresh. Private media on the site hostname uses the existing Payload authorization; the separate media hostname denies it.
- Public image cache writes run through `waitUntil`, allowing bytes to stream immediately. Authorized conditional cache hits return 304 without another R2 read. Publication and manifest-variant checks still precede the cache; private, missing and explicit reload requests bypass reuse. `X-Eatyeet-Media-Cache` distinguishes HIT/MISS/BYPASS.
- Pipeline v4 adds 480px AVIF/WebP variants without upscaling or changing encoding quality. Hero `sizes` now matches the actual 48px mobile inset and 1500px desktop container. Production preconnects to its configured media origin. Previous derivative objects are retained.
- Search and recipe tools have separate client modules. The second pass below adds route boundaries to avoid loading both through the same server catch-all. The search palette remains immediately available; an experiment deferring it until click was rejected by the interaction checks and reverted.

The [OpenNext regional cache](https://opennext.js.org/cloudflare/caching) is used without lazy R2 refresh/tag checks because these public entries are immutable within their generation; this application does not use tag invalidation. [Cloudflare's Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) may be unavailable behind Access, so authenticated staging is not evidence of production edge hit rates. The bounded application cache and R2 fallback still operate there. Never weaken Access to improve a score.

No production speed improvement is claimed until the candidate is validated, released and measured. This issue remains open.

### First staging candidate and second optimization pass

Candidate `b3df0676aee9a917174852c4d1908d65dbde3334` was released to staging as `b3df0676aee9-1789310950068`. An upload timed out before maintenance; the writer and child processes were confirmed stopped, outstanding operations settled, and the heartbeat quiet interval elapsed before recovering ownership and resuming the same release. All 482 media objects and Worker verification completed. Staging reopened and the lock cleared. Production remains on the original cutover release above.

Sequential unthrottled network probes observed staging page responses of 129–203ms after the first homepage request, and image cache HIT responses of 122–201ms after a 563ms MISS. These are Node fetch timings, not mobile browser LCP. Evidence: `.local/performance-staging-network.json`. The three-run mobile medians still failed: Home 77/4900ms, Recipes 76/5193ms, Browse 80/4451ms, Learn 73/6509ms, pizza 76/5289ms, article 74/5669ms. CLS passed. Evidence: `.local/performance-staging-mobile.json`.

A separate full homepage trace observed an 809ms same-URL 307 before a 153ms document response; CDP also observed a production same-URL 307 without server timing. Its cause is not established. Do not label it an application redirect or silently subtract it from acceptance. The trace also identified build-file revalidation and requests waiting behind the operations-bucket admission read.

Second pass:

- Successful hashed Next scripts/styles now receive one-year immutable browser caching; named fonts/favicon receive one day and revalidation. Staging permits private browser caching of these files and published derivatives after authentication. Private media, errors, cookies, pages and APIs remain no-store.
- Build files skip the release-control R2 read after host/Access validation. Content maintenance continues to block pages and images, while existing scripts/fonts remain available. Production verification now checks actual versioned-script headers and zero-byte repeat transfers in an un-intercepted browser context.
- Recipe details and search have distinct Next route entrypoints, preserving their URLs. The former shared server catch-all imported both clients for every route. [Next documents that server-to-client dynamic imports do not provide automatic code splitting](https://nextjs.org/docs/app/guides/lazy-loading); separate routes avoid relying on that unsupported behavior.

Second-pass local verification passed `pnpm test` (61 remote/cache tests, 37 interactions, 90 Storybook stories at two widths), 39 accessibility states, security audit, image delivery, all 15 screenshot captures, and the real Worker smoke including static assets during maintenance. The three-run mobile medians were Home 98/2315ms, Recipes 99/1923ms, Browse 99/1998ms, Learn 99/2038ms, pizza 88/3829ms and article 98/2147ms; CLS passed. Pizza remains outside the local budget. A separate trace observed 423ms LCP on the unthrottled local connection but simulated 3788ms; this does not override the failed median. Parity remains 2/15 against the historical baselines described below, without baseline changes. Logs use `.local/performance-*-3.log`. The shutdown occurred after these checks, not during a deployment; subsequent live status confirmed staging ready and unlocked.

Remote performance tooling now checks the ready release before/after the run and requires each browser navigation to return the requested page with HTTP 200. It cannot accept a login/maintenance page or silently combine different releases. `--diagnostics` preserves per-run Lighthouse reports for investigation.


Verification so far: the full `pnpm test` suite passed (37 browser interaction checks, recipe/formula checks, and 90 Storybook stories at two widths). Accessibility passed 39 page/states; dependency audit reported no known vulnerabilities. Responsive image delivery passed standalone, and all 15 screenshot states captured without page errors when run sequentially. Overlapping local previews caused transient image 500s; subsequent preview checks are sequential. The real Worker smoke test verified a warm image cache, conditional 304, live publication retirement, generation changes and protected paths; it also passed with the final direct public-media path. The focused remote/cache suite has 58 passing tests.

The initial candidate's local three-run medians were Home 98/2304ms, Recipes 99/1923ms, Browse 99/2032ms, Learn 99/2004ms, recipe detail 88/3830ms, article detail 98/2153ms. All CLS values passed. Recipe detail remains a failing local budget. Replacing its dynamic client import with an eager import did not help (88/3842ms), so that experiment was reverted. `pnpm test:lighthouse --path /recipes/new-york-style-pizza --diagnostics` now provides a three-run focused diagnostic without overwriting the all-route report; the default command still measures all six routes.

Visual parity: 2/15 states match the stored baseline; 13 remain reported differences, and no baseline was updated. Side-by-side inspection of Home/mobile, recipe/mobile, workbench/mobile and Search confirms historical contract changes: the old hero kicker/supporting tagline and bold motto; the old filled recipe action row and 68% hydration copy; the old expanded saved-formula form/decimal displays; and the old large filter controls with per-option counts. The current states follow `docs/design-system.md`. The recipe-index diff also highlights photo encoding, the authored sourdough yield and the footer wordmark. These historical differences are not evidence that the caching changes moved those controls. Full pixel parity is not claimed.
