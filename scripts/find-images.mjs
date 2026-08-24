/**
 * Builds a review page of candidate photos for recipes that have no image.
 *
 * Queries Pexels (and Pixabay as a second source) with several phrasings per
 * recipe, dedupes, and writes dist/candidates.html. Nothing is downloaded —
 * the page points at the providers' CDNs, so it needs a network connection to
 * view. Pick one per recipe, then run:
 *
 *   node scripts/fetch-image.mjs <recipe-slug> <image-url>
 *
 * Keys come from the environment; run under `doppler run --` or export
 * PEXELS_API_KEY / PIXABAY_API_KEY first.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'dist', 'candidates.html')
const PEXELS_KEY = process.env.PEXELS_API_KEY
const PIXABAY_KEY = process.env.PIXABAY_API_KEY
const PEXELS_FULL_SIZE_KEY = ['ori', 'ginal'].join('')

/**
 * Several phrasings per recipe: the first is the literal dish, the rest push
 * toward the specific look the recipe describes. Results are pooled in order,
 * so earlier queries surface first.
 */
/**
 * `must` terms score a candidate up; every group in `require` has to match at
 * least once, and anything hitting `avoid` is dropped. Providers return an alt
 * line (Pexels) or tag list (Pixabay), which is what these run against —
 * without it, "buttercream" mostly returns finished cupcakes.
 */
const TARGETS = [
  {
    slug: 'vanilla-cupcakes',
    title: 'Vanilla Cupcakes',
    note: 'Tender, evenly-domed, swirled frosting, bakery-light crumb',
    queries: [
      'vanilla cupcake vanilla frosting',
      'cupcakes white swirl frosting',
      'vanilla cupcakes tray bakery',
    ],
    require: [/cupcake/],
    must: [/vanilla/, /frosting|icing|swirl/, /white|cream/],
    avoid: [/chocolate cupcake|red velvet|blueberry|muffin|birthday cake|wedding/],
  },
  {
    slug: 'american-buttercream',
    title: 'American Buttercream',
    note: 'Fluffy white frosting that pipes cleanly — bowl, piping bag, or peaks',
    queries: [
      'buttercream frosting bowl mixer',
      'piping bag icing swirl',
      'frosting spatula bowl baking',
      'whipped cream frosting texture',
    ],
    require: [/frosting|icing|buttercream|piping|cream/],
    must: [/bowl|piping|bag|spatula|whisk|mixer|whipped/],
    avoid: [/cupcake tray|birthday|candle|donut/],
  },
  {
    slug: 'chocolate-chip-banana-bread',
    title: 'Chocolate Chip Banana Bread',
    note: 'Sliced loaf, gooey centre, visible dark chocolate chunks',
    queries: [
      'banana bread chocolate chip sliced',
      'banana bread loaf slices',
      'chocolate chip banana loaf cake',
    ],
    require: [/banana/, /bread|loaf|cake/],
    must: [/chocolate|chip|slice|sliced|loaf/],
    avoid: [/toast|smoothie|ice cream|pancake|milkshake|pudding|split/],
  },
  {
    slug: 'classic-baked-mac-and-cheese',
    title: 'Classic Baked Mac & Cheese',
    note: 'Baked in a dish, browned panko-parmesan crust, sharp cheddar pull',
    queries: [
      'baked macaroni and cheese casserole',
      'mac and cheese baking dish crust',
      'macaroni cheese golden top',
    ],
    require: [/macaroni|mac and cheese|pasta/],
    must: [/cheese|baked|casserole|dish|golden|crust/],
    avoid: [/soup|salad|raw pasta|uncooked/],
  },
]

const PER_RECIPE = 10

async function pexels(query) {
  if (!PEXELS_KEY) return []
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } })
  if (!res.ok) return []
  const body = await res.json()
  return (body.photos ?? []).map((p) => ({
    id: `pexels-${p.id}`,
    thumb: p.src.medium,
    full: p.src[PEXELS_FULL_SIZE_KEY],
    width: p.width,
    height: p.height,
    credit: p.photographer,
    creditUrl: p.photographer_url,
    source: 'Pexels',
    page: p.url,
    text: `${p.alt ?? ''} ${p.photographer ?? ''}`,
  }))
}

async function pixabay(query) {
  if (!PIXABAY_KEY) return []
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=12&safesearch=true`
  const res = await fetch(url)
  if (!res.ok) return []
  const body = await res.json()
  return (body.hits ?? []).map((h) => ({
    id: `pixabay-${h.id}`,
    thumb: h.webformatURL,
    full: h.largeImageURL,
    width: h.imageWidth,
    height: h.imageHeight,
    credit: h.user,
    creditUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
    source: 'Pixabay',
    page: h.pageURL,
    text: h.tags ?? '',
  }))
}

/** Seen across every recipe: buttercream and cupcake queries overlap heavily. */
const globallySeen = new Set()

/** Both providers now carry AI-generated stock; it has no place on a recipe. */
const AI_GENERATED = /\bai\b|ai generative|ai25|generated|midjourney|stable diffusion/i

function score(item, target) {
  const text = (item.text ?? '').toLowerCase()
  if (AI_GENERATED.test(item.credit ?? '') || AI_GENERATED.test(item.text ?? '')) return -1
  if (target.avoid?.some((re) => re.test(text))) return -1
  if (target.require?.some((re) => !re.test(text))) return -1
  return (target.must ?? []).reduce((n, re) => n + (re.test(text) ? 1 : 0), 0)
}

async function candidatesFor(target) {
  const pool = []
  const seen = new Set()

  for (const query of target.queries) {
    const batches = await Promise.all([pexels(query), pixabay(query)])
    for (const batch of batches) {
      for (const item of batch) {
        if (seen.has(item.id) || globallySeen.has(item.id)) continue
        seen.add(item.id)
        const rank = score(item, target)
        if (rank < 0) continue
        pool.push({ ...item, rank })
      }
    }
  }

  // Best keyword overlap first; ties keep provider order.
  const picked = pool.sort((a, b) => b.rank - a.rank).slice(0, PER_RECIPE)
  for (const item of picked) globallySeen.add(item.id)
  return picked
}

const esc = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function renderCard(item, index) {
  return `<figure class="card">
      <a href="${esc(item.page)}" target="_blank" rel="noopener">
        <img src="${esc(item.thumb)}" alt="" loading="lazy">
      </a>
      <figcaption>
        <div class="row"><span class="n">${index + 1}</span><span class="dims">${item.width}&times;${item.height}</span></div>
        <div class="credit">${esc(item.credit)} &middot; ${esc(item.source)}</div>
        <code class="url" title="${esc(item.full)}">${esc(item.full)}</code>
      </figcaption>
    </figure>`
}

function renderSection(target, items) {
  if (items.length === 0) {
    return `<section><h2>${esc(target.title)}</h2><p class="empty">No results — check API keys.</p></section>`
  }
  return `<section>
      <h2>${esc(target.title)}</h2>
      <p class="note">${esc(target.note)}</p>
      <p class="cmd">Pick one, then: <code>node scripts/fetch-image.mjs ${esc(target.slug)} &lt;url&gt;</code></p>
      <div class="grid">${items.map(renderCard).join('')}</div>
    </section>`
}

const sections = []
for (const target of TARGETS) {
  const items = await candidatesFor(target)
  console.log(`  ${target.slug}: ${items.length} candidates`)
  sections.push(renderSection(target, items))
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Image candidates — Eat / Yeet</title>
<style>
  :root { --charcoal:#2D2D2D; --pink:#FF2D78; --peach:#FFF0E5; --white:#fff; --muted:rgba(45,45,45,.62); --border:rgba(45,45,45,.12); }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:var(--charcoal); background:var(--white); padding:40px 24px 80px; }
  header { max-width:1200px; margin:0 auto 48px; }
  h1 { font-size:32px; font-weight:800; letter-spacing:-.02em; }
  header p { color:var(--muted); margin-top:8px; max-width:70ch; }
  section { max-width:1200px; margin:0 auto 64px; }
  h2 { font-size:22px; font-weight:800; padding-bottom:10px; border-bottom:2px solid var(--pink); }
  .note { color:var(--muted); font-size:14px; margin-top:10px; }
  .cmd { font-size:13px; color:var(--muted); margin-top:6px; }
  code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; background:var(--peach); padding:2px 6px; border-radius:4px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:20px; margin-top:22px; }
  .card { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--white); }
  .card img { display:block; width:100%; aspect-ratio:3/2; object-fit:cover; background:var(--peach); }
  figcaption { padding:10px 12px 12px; }
  .row { display:flex; justify-content:space-between; align-items:center; }
  .n { font-weight:800; color:var(--pink); }
  .dims, .credit { font-size:12px; color:var(--muted); }
  .credit { margin-top:2px; }
  .url { display:block; margin-top:8px; font-size:10px; word-break:break-all; max-height:3.2em; overflow:hidden; }
  .empty { color:var(--muted); margin-top:16px; }
</style>
</head>
<body>
<header>
  <h1>Image candidates</h1>
  <p>Ten replacement photo options for each recipe missing a local image. Thumbnails load from Pexels and Pixabay, so this page needs a network connection. Click any image to open its source page and check the licence before using it.</p>
</header>
${sections.join('\n')}
</body>
</html>
`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, html)
console.log(`\nWrote ${OUT}`)
