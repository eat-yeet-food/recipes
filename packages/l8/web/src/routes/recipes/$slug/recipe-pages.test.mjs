/**
 * Focused coverage for the registry-backed block page surface.
 *
 * Static assertions only prove that files exist. This opens every canonical
 * recipe route and checks that the route renders the generic article shell,
 * registered recipe block, desktop-only browse sidebar, and mobile/cook-mode
 * behavior.
 */
import { chromium } from 'playwright'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

import { startStatic } from '#web-test/static-server'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..', '..')
const APP_ID = process.env.APP_ID || 'eatyeet'
const INDEX = JSON.parse(readFileSync(join(ROOT, 'apps', APP_ID, 'generated', 'index.json'), 'utf8'))

const server = await startStatic(join(ROOT, '.output', 'public'))
const BASE = server.url.replace(/\/$/, '')
const browser = await chromium.launch()
const results = []
const errors = []

const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: ok ? '' : detail })

async function newPage(viewport = { width: 1440, height: 1000 }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width < 700 ? 2 : 1 })
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return page
}

for (const recipe of INDEX) {
  const page = await newPage()
  await page.goto(`${BASE}/recipes/${recipe.slug}`, { waitUntil: 'networkidle' })

  const facts = await page.evaluate((expectedTitle) => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? ''
    return {
      h1: text('h1'),
      hasNewRecipe: !!document.querySelector('.yeet'),
      hasOldRecipe: !!document.querySelector('.recipe-rich'),
      hasRecipeCard: !!document.querySelector('#recipe-card'),
      shareRailCount: document.querySelectorAll('[aria-label="Share"], .yeet-social').length,
      printButtons: Array.from(document.querySelectorAll('button')).filter((button) =>
        button.textContent?.includes('Print'),
      ).length,
      cookButtons: Array.from(document.querySelectorAll('button')).filter((button) =>
        button.textContent?.includes('Cook Mode'),
      ).length,
      browseCards: document.querySelectorAll('[data-yeet-browse] a[href^="/recipes/"]').length,
      sidebarDisplay: getComputedStyle(document.querySelector('[data-yeet-browse]')).display,
      titleVisible: text('h1') === expectedTitle,
    }
  }, recipe.title)

  check(`${recipe.slug} renders generic block page`, facts.hasNewRecipe && !facts.hasOldRecipe, JSON.stringify(facts))
  check(`${recipe.slug} has matching h1`, facts.titleVisible, `${facts.h1} !== ${recipe.title}`)
  check(`${recipe.slug} renders recipe card`, facts.hasRecipeCard)
  check(`${recipe.slug} does not render duplicate side actions`, facts.shareRailCount === 0, JSON.stringify(facts))
  check(`${recipe.slug} has print and cook controls`, facts.printButtons >= 2 && facts.cookButtons >= 2, JSON.stringify(facts))
  check(`${recipe.slug} shows desktop browse sidebar`, facts.sidebarDisplay === 'block' && facts.browseCards === 4, JSON.stringify(facts))

  await page.close()
}

const desktop = await newPage()
await desktop.goto(`${BASE}/recipes/artisan-new-york-pizza`, { waitUntil: 'networkidle' })
await desktop.locator('.yeet-card-actions button:has-text("Cook Mode")').click()
await desktop.waitForTimeout(200)
check(
  'cook mode hides browse sidebar',
  await desktop.locator('[data-yeet-browse]').evaluate((el) => getComputedStyle(el).display === 'none'),
)
check(
  'cook mode marks article root',
  await desktop.locator('.yeet.yeet-cook').count() === 1,
)
await desktop.close()

const phone = await newPage({ width: 390, height: 900 })
await phone.goto(`${BASE}/recipes/artisan-new-york-pizza`, { waitUntil: 'networkidle' })
check(
  'recipe browse sidebar hidden on phone',
  await phone.locator('[data-yeet-browse]').evaluate((el) => getComputedStyle(el).display === 'none'),
)
await phone.close()

await browser.close()
await server.close()

for (const result of results) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.name}${result.detail ? ' :: ' + result.detail : ''}`)
}

if (errors.length) {
  console.log('\nPage errors:')
  for (const error of errors) console.log('  ' + error)
}

const failed = results.filter((result) => !result.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed || errors.length ? 1 : 0)
