/**
 * Focused coverage for the redesigned recipe page surface.
 *
 * Static assertions only prove that files exist. This opens every canonical
 * recipe route and checks that the route renders the new article component,
 * keeps the trial-only links out of production pages, and preserves the
 * desktop-only browse sidebar and mobile/cook-mode behavior.
 */
import { chromium } from 'playwright'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

import { startStatic } from './static-server.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX = JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'index.json'), 'utf8'))

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
      hasNewRecipe: !!document.querySelector('.bb-trial'),
      hasOldRecipe: !!document.querySelector('.recipe-rich'),
      hasRecipeCard: !!document.querySelector('#trial-recipe-card'),
      originalLinkCount: Array.from(document.querySelectorAll('a')).filter(
        (link) => link.textContent?.trim() === 'Original',
      ).length,
      printButtons: Array.from(document.querySelectorAll('button')).filter((button) =>
        button.textContent?.includes('Print'),
      ).length,
      cookButtons: Array.from(document.querySelectorAll('button')).filter((button) =>
        button.textContent?.includes('Cook Mode'),
      ).length,
      browseCards: document.querySelectorAll('[data-bb-trial-browse] a[href^="/recipes/"]').length,
      sidebarDisplay: getComputedStyle(document.querySelector('[data-bb-trial-browse]')).display,
      titleVisible: text('h1') === expectedTitle,
    }
  }, recipe.title)

  check(`${recipe.slug} renders new recipe layout`, facts.hasNewRecipe && !facts.hasOldRecipe, JSON.stringify(facts))
  check(`${recipe.slug} has matching h1`, facts.titleVisible, `${facts.h1} !== ${recipe.title}`)
  check(`${recipe.slug} renders recipe card`, facts.hasRecipeCard)
  check(`${recipe.slug} hides trial-only Original link`, facts.originalLinkCount === 0, String(facts.originalLinkCount))
  check(`${recipe.slug} has print and cook controls`, facts.printButtons >= 2 && facts.cookButtons >= 2, JSON.stringify(facts))
  check(`${recipe.slug} shows desktop browse sidebar`, facts.sidebarDisplay === 'block' && facts.browseCards === 4, JSON.stringify(facts))

  await page.close()
}

const desktop = await newPage()
await desktop.goto(`${BASE}/recipes/artisan-new-york-pizza`, { waitUntil: 'networkidle' })
await desktop.locator('.bb-trial-card-actions button:has-text("Cook Mode")').click()
await desktop.waitForTimeout(200)
check(
  'cook mode hides browse sidebar',
  await desktop.locator('[data-bb-trial-browse]').evaluate((el) => getComputedStyle(el).display === 'none'),
)
check(
  'cook mode marks article root',
  await desktop.locator('.bb-trial.bb-trial-cook').count() === 1,
)
await desktop.close()

const phone = await newPage({ width: 390, height: 900 })
await phone.goto(`${BASE}/recipes/artisan-new-york-pizza`, { waitUntil: 'networkidle' })
check(
  'recipe browse sidebar hidden on phone',
  await phone.locator('[data-bb-trial-browse]').evaluate((el) => getComputedStyle(el).display === 'none'),
)
await phone.close()

const storybook = await newPage()
await storybook.goto(`${BASE}/storybook`, { waitUntil: 'networkidle' })
check('storybook route renders harness', await storybook.locator('[data-storybook]').isVisible())
check('storybook route renders recipe story', await storybook.locator('[data-storybook-recipe-frame] .bb-trial').isVisible())
check('storybook route has multiple sections', (await storybook.locator('[data-storybook-section]').count()) >= 5)
await storybook.close()

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
