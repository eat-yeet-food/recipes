/**
 * Static build assertions for the fully prerendered site.
 *
 * Browser tests cover interaction. This file catches missing prerendered pages,
 * SEO artifacts, generated recipe chunks, and broken local asset references
 * before the build is deployed as plain files.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { allPaths } from '../site.config.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.output', 'public')
const INDEX = JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'index.json'), 'utf8'))

const failures = []
const check = (name, ok, detail = '') => {
  failures.push({ name, ok: !!ok, detail })
}

const exists = (path) => existsSync(join(OUT, path.replace(/^\//, '')))
const readOut = (path) => readFileSync(join(OUT, path.replace(/^\//, '')), 'utf8')
const tryReadOut = (path) => (exists(path) ? readOut(path) : '')

check('build output exists', existsSync(OUT), OUT)
check('home is prerendered', exists('/index.html'), '/index.html')
check('recipe index is prerendered', exists('/recipes/index.html'), '/recipes/index.html')
check('browse is prerendered', exists('/browse/index.html'), '/browse/index.html')

// Load-bearing: Pages serves this, with a real 404, for any path it cannot
// match. Without it a missing /build/* asset comes back as HTML under a 200 and
// the edge pins it immutable for a year. CLAUDE.md #6.
check('404.html is prerendered', exists('/404.html'), '/404.html')
check('search is prerendered once', exists('/search/index.html'), '/search/index.html')
check('sitemap exists', exists('/sitemap.xml'), '/sitemap.xml')
check('robots exists', exists('/robots.txt'), '/robots.txt')
check('headers exist', exists('/_headers'), '/_headers')

for (const recipe of INDEX) {
  check(`${recipe.slug} page is prerendered`, exists(`/recipes/${recipe.slug}/index.html`))
  if (recipe.image) check(`${recipe.slug} image exists`, exists(`/images/${recipe.image}`))
}

const sitemap = tryReadOut('/sitemap.xml')
const robots = tryReadOut('/robots.txt')
const headers = tryReadOut('/_headers')
const home = tryReadOut('/index.html')

check('sitemap omits search', !sitemap.includes('https://eatyeet.com/search'))
check('robots disallows search', robots.includes('Disallow: /search'))
check('hashed build assets get a long max-age', /\/build\/\*\s*\n\s*Cache-Control: public, max-age=31536000\s*(\n|$)/.test(headers))

// Not an oversight: `immutable` stops browsers revalidating even on reload, so
// a body cached during a propagation window survives a year in every client
// that saw it, reachable by no purge. The filename is already content-hashed,
// so it prevented nothing that mattered. CLAUDE.md #6.
check('hashed build assets are NOT immutable', !headers.includes('immutable'))

// The security headers must stay alone under /* — Pages merges every matching
// rule, so a Cache-Control here would recombine with /build/*.
check('/* carries no Cache-Control', /\/\*\s*\n\s*X-Content-Type-Options/.test(headers))

// HTML names the hashed assets, so a stale document points a browser at a build
// that may no longer be current. Five minutes bounds that exposure. Generated
// from site.config.mjs, so every prerendered route must carry the rule.
const pageTtlMissing = allPaths(INDEX).filter(
  (path) => !new RegExp(`^${path.replace(/[/]/g, '\\/')}\\n  Cache-Control: public, max-age=300, must-revalidate$`, 'm').test(headers),
)
check('every page has a 5-minute TTL', pageTtlMissing.length === 0, pageTtlMissing.join(', '))

const notFoundHtml = tryReadOut('/404.html')
check('404 page is themed and offers a way out', notFoundHtml.includes('Page Not Found') && notFoundHtml.includes('All Recipes'))
check('home contains app root content', home.includes('Eat the best. Yeet the rest.'))
check(
  'footer links point to real pages',
  !/<a[^>]*>(About|Privacy|Terms)<\/a>/.test(home) &&
    /<a[^>]+href="\/"[^>]*>Home<\/a>/.test(home) &&
    /<a[^>]+href="\/search"[^>]*>Recipes<\/a>/.test(home) &&
    /<a[^>]+href="\/browse"[^>]*>Browse<\/a>/.test(home),
)

const scripts = [...home.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1])
for (const src of scripts.filter((value) => value.startsWith('/'))) {
  check(`script asset exists: ${src}`, exists(src))
}

const recipeChunks = readdirSync(join(OUT, 'build')).filter((file) => file.endsWith('.js'))
for (const recipe of INDEX) {
  check(
    `${recipe.slug} body chunk exists`,
    recipeChunks.some((file) => file.startsWith(`${recipe.slug}-`)),
  )
}

for (const result of failures) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.name}${result.detail ? ` :: ${result.detail}` : ''}`)
}

const failed = failures.filter((result) => !result.ok).length
console.log(`\n${failures.length - failed}/${failures.length} passed`)
process.exit(failed ? 1 : 0)
