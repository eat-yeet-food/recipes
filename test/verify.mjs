/**
 * Runs the shipped browser bundle from dist/recipes.html in a stubbed DOM and
 * exercises routing + rendering the way a browser would.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const target = process.argv[2] ?? fileURLToPath(new URL('../dist/recipes.html', import.meta.url))
const html = readFileSync(target, 'utf8')
const [dataScript, bundle] = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])

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

// --- file:// safety -----------------------------------------------------
// The output is opened by double-clicking, so anything the browser would have
// to go fetch is a silent failure. Everything must already be in the document.
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

// --- report -------------------------------------------------------------
const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? ' :: ' + r.detail : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
