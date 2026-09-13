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

The production deployment remains the preceding requested milestone. Recovery-secret enrollment was still incomplete when this note was written; no production measurements or performance fixes are claimed here.
