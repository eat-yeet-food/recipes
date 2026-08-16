/**
 * Drives the built site the way a person would: opens the search palette,
 * types, navigates with the keyboard, and toggles filter checkboxes. Catches
 * the wiring bugs that static assertions and pixel diffs can't — a control
 * rendered perfectly and bound to nothing looks identical in a screenshot.
 */
import { chromium } from 'playwright'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

import { startStatic } from './static-server.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS = join(ROOT, 'dist', 'shots')
mkdirSync(SHOTS, { recursive: true })

const server = await startStatic(join(ROOT, '.output', 'public'))
const BASE = server.url.replace(/\/$/, '')

const results = []
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: ok ? '' : detail })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const dialog = () => page.locator('[data-slot="dialog-content"]')

await page.goto(BASE + '/', { waitUntil: 'networkidle' })

// --- prerendered content is present before any JS runs -------------------
check('home prerenders its hero', await page.locator('text=Eat the best. Yeet the rest.').isVisible())

// --- palette opens from the nav button ---------------------------------
check('palette starts hidden', await dialog().isHidden())

await page.locator('[data-palette-open]').first().click()
await page.waitForTimeout(200)
check('palette opens on nav click', await dialog().isVisible())
check('palette input focused', await page.evaluate(() => document.activeElement?.id === 'palette-input'))

// --- typing produces results -------------------------------------------
await page.keyboard.type('pizza')
await page.waitForTimeout(250)
const hits = await page.locator('[data-palette-hit]').count()
check('typing yields results', hits > 0, `hits=${hits}`)
await page.screenshot({ path: join(SHOTS, 'palette.png') })

// --- keyboard navigation ------------------------------------------------
await page.keyboard.press('Enter')
await page.waitForTimeout(400)
check('enter opens recipe', page.url().includes('/recipes/'), page.url())
check('palette closed after nav', await dialog().isHidden())
check('recipe body rendered', await page.locator('h1').first().isVisible())

// --- cmd+k toggles ------------------------------------------------------
await page.keyboard.press('Meta+k')
await page.waitForTimeout(200)
check('cmd+k opens palette', await dialog().isVisible())
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
check('escape closes palette', await dialog().isHidden())

// --- no results state ---------------------------------------------------
await page.locator('[data-palette-open]').first().click()
await page.keyboard.type('zzzznope')
await page.waitForTimeout(250)
check('no-results message', await page.locator('text=No recipes found for').isVisible())
await page.keyboard.press('Escape')

// --- filter sidebar -----------------------------------------------------
await page.goto(BASE + '/search', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const boxes = await page.locator('main aside [data-facet][data-value]').count()
check('sidebar renders checkboxes', boxes > 0, `boxes=${boxes}`)
check('category toggle renders', (await page.locator('main aside [data-category]').count()) > 0)

const before = await page.locator('text=/^\\d+ recipes?$/').first().textContent()
await page.locator('main aside [data-facet="methods"][data-value="grilling"]').click()
await page.waitForTimeout(300)
const after = await page.locator('text=/^\\d+ recipes?$/').first().textContent()
check('checkbox filters results', before !== after, `${before} -> ${after}`)
check(
  'checkbox reflects checked state',
  await page.evaluate(
    () => !!document.querySelector('main aside [data-facet="methods"][data-value="grilling"] [data-state="checked"]'),
  ),
)
check('filter is in the URL', page.url().includes('methods=grilling'), page.url())
await page.screenshot({ path: join(SHOTS, 'search-filtered.png') })

// --- category single-select --------------------------------------------
await page.locator('main aside [data-category="savory"]').click()
await page.waitForTimeout(300)
check('category toggle filters', page.url().includes('category=savory'), page.url())

// --- clear all ----------------------------------------------------------
await page.locator('#clear-filters').click()
await page.waitForTimeout(300)
check('clear all resets', !page.url().includes('methods='), page.url())

// --- browse links carry readable search params --------------------------
await page.goto(BASE + '/browse', { waitUntil: 'networkidle' })
await page.waitForTimeout(200)
const href = await page.locator('a[href*="/search?"]').first().getAttribute('href')
check('browse links use plain params', /\/search\?\w+=[\w,-]+$/.test(href ?? ''), String(href))

// --- no sign in button --------------------------------------------------
check('no sign-in button', (await page.locator('text=Sign in').count()) === 0)

// --- browse lists each category once ------------------------------------
// It once rendered the eight featured categories in a photo grid *and* again
// in their facet sections.
const browseLabels = await page.evaluate(() =>
  Array.from(document.querySelectorAll('main a[href*="/search?"]'), (a) => a.textContent.trim()),
)
check(
  'browse lists each category once',
  new Set(browseLabels).size === browseLabels.length,
  browseLabels.join(', '),
)

// --- every page has exactly one h1 --------------------------------------
for (const [path, want] of [
  ['/browse', 'Browse Recipes'],
  ['/recipes', 'All Recipes'],
  ['/search', 'Recipes'],
]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  const h1s = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1'), (h) => h.textContent.trim()),
  )
  check(`${path} has one h1`, h1s.length === 1 && h1s[0] === want, JSON.stringify(h1s))
}

// --- "View all categories" goes to /browse ------------------------------
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
const catsHref = await page.evaluate(
  () =>
    Array.from(document.querySelectorAll('a'))
      .find((a) => a.textContent.includes('View all categories'))
      ?.getAttribute('href'),
)
check('View all categories -> /browse', catsHref === '/browse', String(catsHref))

// --- the nav leaves its hero state on scroll ----------------------------
// Without a scroll listener the recipe nav stays transparent with white text,
// which lands white-on-white over the content card.
await page.goto(BASE + '/recipes/charred-crust-pizza', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const navTop = await page.evaluate(() => getComputedStyle(document.querySelector('nav')).backgroundColor)
await page.evaluate(() => window.scrollTo(0, 1400))
await page.waitForTimeout(500)
const navDown = await page.evaluate(() => ({
  bg: getComputedStyle(document.querySelector('nav')).backgroundColor,
  link: getComputedStyle(document.querySelector('nav a[href="/search"]')).color,
}))
check('nav transparent over the hero', navTop === 'rgba(0, 0, 0, 0)', navTop)
check('nav becomes opaque on scroll', navDown.bg !== 'rgba(0, 0, 0, 0)', navDown.bg)
check('nav text darkens on scroll', navDown.link !== 'rgb(255, 255, 255)', navDown.link)

// --- cold loads throw nothing -------------------------------------------
// Only one /search document is prerendered and Pages serves it for every query
// string, so `/search?courses=mains` hydrated against markup rendered with no
// filters and threw React #418, discarding the server HTML. Every browse card
// links to exactly such a URL. Reaching that state by clicking never
// reproduced it — each of these has to be a fresh navigation.
for (const path of ['/', '/browse', '/recipes', '/search', '/search?courses=mains', '/search?q=pizza']) {
  const cold = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const thrown = []
  cold.on('pageerror', (e) => thrown.push(e.message.split('\n')[0]))
  cold.on('console', (m) => m.type() === 'error' && thrown.push(m.text()))
  await cold.goto(BASE + path, { waitUntil: 'networkidle' })
  await cold.waitForTimeout(600)
  check(`cold load is clean: ${path}`, thrown.length === 0, thrown[0]?.slice(0, 90) ?? '')
  await cold.close()
}

// --- filters are reachable on a phone -----------------------------------
// The sidebar is `hidden` below lg, matching the original, which paired it
// with a mobile sheet. Without a mobile affordance there is no way to filter.
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } })
await phone.goto(BASE + '/search', { waitUntil: 'networkidle' })
await phone.waitForTimeout(300)
check('desktop sidebar hidden on phone', await phone.locator('main aside').isHidden())
check('mobile filter trigger visible', await phone.locator('[data-mobile-filters]').isVisible())
await phone.locator('[data-mobile-filters]').click()
await phone.waitForTimeout(300)
check(
  'mobile filters expand',
  (await phone.locator('#mobile-filters [data-facet][data-value]').count()) > 0,
)
await phone.close()

await browser.close()
await server.close()

for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? ' :: ' + r.detail : ''}`)
if (errors.length) {
  console.log('\nPage errors:')
  for (const e of errors) console.log('  ' + e)
}
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed || errors.length ? 1 : 0)
