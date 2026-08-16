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
const boxes = await page.locator('[data-facet][data-value]').count()
check('sidebar renders checkboxes', boxes > 0, `boxes=${boxes}`)
check('category toggle renders', (await page.locator('[data-category]').count()) > 0)

const before = await page.locator('text=/^\\d+ recipes?$/').first().textContent()
await page.locator('[data-facet="methods"][data-value="grilling"]').click()
await page.waitForTimeout(300)
const after = await page.locator('text=/^\\d+ recipes?$/').first().textContent()
check('checkbox filters results', before !== after, `${before} -> ${after}`)
check(
  'checkbox reflects checked state',
  await page.evaluate(
    () => !!document.querySelector('[data-facet="methods"][data-value="grilling"] [data-state="checked"]'),
  ),
)
check('filter is in the URL', page.url().includes('methods=grilling'), page.url())
await page.screenshot({ path: join(SHOTS, 'search-filtered.png') })

// --- category single-select --------------------------------------------
await page.locator('[data-category="savory"]').click()
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
