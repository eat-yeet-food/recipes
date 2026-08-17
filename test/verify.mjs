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
check('search is prerendered once', exists('/search/index.html'), '/search/index.html')
check('storybook harness is prerendered', exists('/storybook/index.html'), '/storybook/index.html')
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
check('sitemap omits storybook', !sitemap.includes('https://eatyeet.com/storybook'))
check('robots disallows search', robots.includes('Disallow: /search'))
check('robots disallows storybook', robots.includes('Disallow: /storybook'))
check('hashed build assets are immutable', headers.includes('/build/*') && headers.includes('immutable'))
check('home contains app root content', home.includes('Eat the best. Yeet the rest.'))

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
