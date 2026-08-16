/**
 * Runs the shipped browser bundle in a stubbed DOM and exercises routing +
 * rendering the way a browser would.
 *
 * Defaults to the single-file build; `--web` checks dist/index.html instead.
 * Everything about routing and rendering is asserted for both, since both come
 * out of the same render(). Only the asset-embedding rules differ.
 */
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const args = process.argv.slice(2)
const web = args.includes('--web')
const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const target = args.find((a) => !a.startsWith('--')) ?? join(DIST, web ? 'index.html' : 'recipes.html')
const html = readFileSync(target, 'utf8')

/** The data payload and bundle, however this target references them. */
function scriptSources() {
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  if (inline.length >= 2) return inline
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) =>
    readFileSync(join(DIST, m[1].slice(1)), 'utf8'),
  )
}

const [dataScript, bundle] = scriptSources()

let appHtml = ''
const listeners = {}
const elements = new Map()

function stubEl(id) {
  return {
    id,
    value: '',
    dataset: {},
    focus() {},
    setSelectionRange() {},
    addEventListener() {},
    get innerHTML() {
      return appHtml
    },
    set innerHTML(v) {
      appHtml = v
    },
  }
}

const location = { hash: '' }
const ctx = {
  window: {
    __RECIPES__: null,
    __CATEGORIES__: null,
    __INITIAL_ROUTE__: null,
    addEventListener: (ev, fn) => (listeners[ev] = fn),
    scrollTo() {},
  },
  document: {
    title: '',
    getElementById: (id) => {
      if (id === 'app') {
        if (!elements.has('app')) elements.set('app', stubEl('app'))
        return elements.get('app')
      }
      return null
    },
    querySelectorAll: () => [],
    // No real DOM here: report the palette absent so its wiring no-ops. The
    // palette is exercised for real in test/interact.mjs.
    querySelector: () => null,
    body: { style: {} },
  },
  location,
  history: { replaceState(_, __, hash) { location.hash = hash } },
  setTimeout,
  clearTimeout,
  console,
}
ctx.window.location = location
ctx.window.document = ctx.document
vm.createContext(ctx)

vm.runInContext(dataScript, ctx)
vm.runInContext(bundle, ctx)

const results = []
const check = (name, cond, detail = '') =>
  results.push({ name, ok: !!cond, detail: cond ? '' : detail })
const skip = (name, why) => results.push({ name, ok: true, skipped: true, detail: why })

// --- routing ------------------------------------------------------------
const parse = (h) => ctx.parseHash(h)
check('parseHash #/ -> home', parse('#/').name === 'home')
check('parseHash empty -> home', parse('').name === 'home')
check('parseHash #/r/slug', parse('#/r/charred-crust-pizza').slug === 'charred-crust-pizza')
check('parseHash #/c/slug', parse('#/c/baking').slug === 'baking')
const s = parse('#/search?q=cheese%20bread&courses=mains,desserts')
check('parseHash query', s.state.q === 'cheese bread', JSON.stringify(s.state.q))
check('parseHash facets', s.state.courses.join('|') === 'mains|desserts', JSON.stringify(s.state.courses))
check('parseHash unknown -> notFound', parse('#/nope').name === 'notFound')

// --- hash building round-trips -----------------------------------------
const built = ctx.searchHash({ q: 'a&b=c', courses: ['mains'], cuisines: [] })
check('searchHash round-trip q', parse(built).state.q === 'a&b=c', built)
check('searchHash round-trip facet', parse(built).state.courses.join() === 'mains', built)
check('searchHash empty -> #/search', ctx.searchHash({}) === '#/search', ctx.searchHash({}))

// --- rendering each route ----------------------------------------------
const recipes = ctx.window.__RECIPES__
const cats = ctx.window.__CATEGORIES__
const assets = ctx.window.__ASSETS__
const browse = ctx.window.__BROWSE_CARDS__
const shell = (route) => ctx.renderShell(recipes, cats, route, assets, browse)

const home = shell({ name: 'home' })
check('home has hero', home.includes('font-hero') && home.includes('Eat the best. Yeet the rest.'))
check('home has 8 browse cards', (home.match(/#\/c\//g) || []).length === 8, String((home.match(/#\/c\//g)||[]).length))
check('home has 6 recipe cards', (home.match(/href="#\/r\//g) || []).length === 6, String((home.match(/href="#\/r\//g)||[]).length))

const recipePage = shell({ name: 'recipe', slug: 'charred-crust-pizza' })
check('recipe title', recipePage.includes('Charred Crust Pizza'))
check('recipe prep humanized', recipePage.includes('4 days'), 'no humanized prep')
check('recipe has ordered steps', recipePage.includes('<ol role="list" class="flex list-none flex-col gap-6 p-0">'))
check('recipe keeps affiliate link', recipePage.includes('amazon.com'))
check('recipe named sections', recipePage.includes('>Pizza Sauce</h3>'))
check('recipe metadata bar', recipePage.includes('Prep Time') && recipePage.includes('Total Time'))
check('missing recipe handled', shell({ name: 'recipe', slug: 'nope' }).includes('not found'))

const catPage = shell({ name: 'category', slug: 'baking' })
check('category title', catPage.includes('>Baking</h1>'))
check('category count', catPage.includes('6 recipes'), 'expected 6')
check('unknown category handled', shell({ name: 'category', slug: 'zzz' }).includes('Unknown category'))

const searchAll = shell({ name: 'search', state: parse('#/search').state })
check('search shows all 12', searchAll.includes('12 recipes'))
const searchQ = shell({ name: 'search', state: parse('#/search?q=cheese').state })
check('search q=cheese -> 2', searchQ.includes('2 recipes'), 'query filter')
const searchFacet = shell({ name: 'search', state: parse('#/search?methods=grilling').state })
check('search facet grilling -> 1', searchFacet.includes('1 recipe'), 'facet filter')
const searchNone = shell({ name: 'search', state: parse('#/search?q=zzzznope').state })
check('search empty state', searchNone.includes('No recipes found'))
check('chips carry data attrs', searchAll.includes('data-facet="methods"'))

// --- titles -------------------------------------------------------------
check(
  'title for recipe',
  ctx.pageTitle(recipes, cats, { name: 'recipe', slug: 'donut-glaze' }).startsWith('Donut Glaze'),
)

// --- asset embedding ----------------------------------------------------
// The single-file build is opened by double-clicking, so anything the browser
// would have to go fetch is a silent failure: it must all already be in the
// document. The web build is the exact inverse. These assertions still gate
// dist/recipes.html on every run, so they are skipped here, never dropped.
const FILE_ONLY = [
  'no type="module"',
  'no fetch()',
  'no dynamic import / XHR',
  'no external <link>',
  'no external <script src>',
  'markup refs are hash-only',
  'fonts embedded as data URIs',
  'under 8 MB',
]

if (!web) {
  const markup = html.slice(html.indexOf('<div id="app">'), html.indexOf('<script>'))
  const refs = [...markup.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)].map((m) => m[1])
  const external = refs.filter((r) => !r.startsWith('#') && !r.startsWith('data:'))

  check('no type="module"', !/type=["']module["']/.test(html))
  check('no fetch()', !/\bfetch\s*\(/.test(html))
  check('no dynamic import / XHR', !/XMLHttpRequest|importScripts|\bimport\s*\(/.test(html))
  check('no external <link>', !/<link[^>]+href/i.test(html))
  check('no external <script src>', !/<script[^>]+src=/i.test(html))
  check('markup refs are hash-only', external.length === 0, external.slice(0, 5).join(', '))
  check('fonts embedded as data URIs', (html.match(/url\(data:font/g) || []).length === 5)
  check('under 8 MB', Buffer.byteLength(html) < 8 * 1024 * 1024, `${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`)
} else {
  for (const name of FILE_ONLY) skip(name, 'single-file target')

  // Everything the home route pulls: markup images (including the CSS
  // background-image the mobile hero uses), the stylesheet, both scripts, and
  // the fonts the stylesheet itself asks for.
  const docRefs = [
    ...[...html.matchAll(/(?:src|href)\s*=\s*"(\/[^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/url\('(\/[^']+)'\)/g)].map((m) => m[1]),
  ]
  const sheet = html.match(/<link rel="stylesheet" href="([^"]+)">/)?.[1]
  const cssText = sheet ? readFileSync(join(DIST, sheet.slice(1)), 'utf8') : ''
  const cssRefs = [...cssText.matchAll(/url\((\/[^)]+)\)/g)].map((m) => m[1])
  const all = [...new Set([...docRefs, ...cssRefs])]

  const missing = all.filter((r) => !existsSync(join(DIST, r.slice(1))))
  const unhashed = all.filter((r) => !/\.[0-9a-f]{8}\.[a-z0-9]+$/.test(r))
  const bytes = all.reduce((n, r) => n + statSync(join(DIST, r.slice(1))).size, Buffer.byteLength(html))
  const headers = join(DIST, '_headers')

  check('entry point is index.html', target.endsWith('index.html'))
  check('stylesheet is a real file', !!sheet, 'no <link rel=stylesheet>')
  // The hash pins this to the original site's donut-icon.svg byte-for-byte, so
  // swapping the file for a lookalike fails here rather than shipping quietly.
  check(
    'favicon is the original donut icon',
    html.includes('<link rel="icon" href="/assets/img/donut-icon.d1d43258.svg" type="image/svg+xml">'),
  )
  check(
    'critical fonts preloaded',
    (html.match(/rel="preload"[^>]+as="font"/g) ?? []).length === 3,
    `${(html.match(/rel="preload"/g) ?? []).length} preloads`,
  )
  check('every reference resolves on disk', missing.length === 0, missing.slice(0, 5).join(', '))
  check('assets are content-hashed', unhashed.length === 0, unhashed.slice(0, 5).join(', '))
  check('no data: URIs remain', !/data:(?:image|font)\//.test(html) && !/data:font\//.test(cssText))
  check('fonts are separate files', cssRefs.length === 5, `${cssRefs.length} font refs`)
  check('index.html under 100 KB', Buffer.byteLength(html) < 100 * 1024, `${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`)
  check('home first load under 3 MB', bytes < 3 * 1024 * 1024, `${(bytes / 1024 / 1024).toFixed(2)} MB`)
  check('_headers caches assets immutably', existsSync(headers) && readFileSync(headers, 'utf8').includes('immutable'))
  console.log(`\n  home first load: ${(bytes / 1024 / 1024).toFixed(2)} MB across ${all.length + 1} requests\n`)
}

// --- report -------------------------------------------------------------
const failed = results.filter((r) => !r.ok)
const skipped = results.filter((r) => r.skipped)
for (const r of results) {
  const status = r.skipped ? 'skip' : r.ok ? 'ok  ' : 'FAIL'
  console.log(`${status}  ${r.name}${r.detail ? ' :: ' + r.detail : ''}`)
}
console.log(
  `\n${results.length - failed.length - skipped.length}/${results.length - skipped.length} passed` +
    (skipped.length ? ` (${skipped.length} skipped)` : ''),
)
process.exit(failed.length ? 1 : 0)
