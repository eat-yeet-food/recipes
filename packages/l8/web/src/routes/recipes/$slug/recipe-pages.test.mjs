/**
 * Focused coverage for the registry-backed block page surface.
 *
 * Static assertions only prove that files exist. This opens every canonical
 * recipe route and checks that the route renders the generic article shell,
 * registered recipe block, desktop-only browse sidebar, mobile/cook-mode
 * behavior, and the Notebook entry point that replaced Adjust recipe.
 */
import { signIn } from '#web-test/member-session'
import { chromium } from 'playwright'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

import { RESOLVED_APP_PATHS } from '#web-test/app-paths'
import { startApp as startStatic } from '#web-test/static-server'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..', '..')
const INDEX = JSON.parse(readFileSync(join(RESOLVED_APP_PATHS.generatedDir, 'index.json'), 'utf8'))

const server = await startStatic(join(ROOT, '.output', 'public'))
const BASE = server.url.replace(/\/$/, '')
const browser = await chromium.launch()
const results = []
const errors = []

const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: ok ? '' : detail })

async function newPage(viewport = { width: 1440, height: 1000 }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width < 700 ? 2 : 1 })
  // Members see their Notebook versions beside the recipe.
  await signIn(page.context(), BASE)
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
      cookingButtons: Array.from(document.querySelectorAll('button')).filter((button) =>
        button.textContent?.includes('Cooking view'),
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
  check(`${recipe.slug} has one print control and one dedicated cooking button`, facts.printButtons === 1 && facts.cookingButtons === 1, JSON.stringify(facts))
  check(`${recipe.slug} shows desktop browse sidebar`, facts.sidebarDisplay === 'block' && facts.browseCards === 4, JSON.stringify(facts))

  await page.close()
}

const desktop = await newPage()
await desktop.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
check(
  'variant selector is removed',
  await desktop.locator('[aria-label="Recipe variants"]').count() === 0,
)
check('pizza uses the authored mozzarella', (await desktop.locator('#recipe-card').textContent()).includes("Trader Joe's whole milk low moisture mozzarella"))
check('pizza no longer requires frozen provolone', !(await desktop.locator('#recipe-card').textContent()).toLowerCase().includes('provolone'))
check('pizza links the recommended mozzarella', await desktop.locator('#recipe-card a[href*="traderjoes.com/home/search"]').count() === 1)
check('pizza recommends the selected mozzarella', (await desktop.locator('#recipe-card').textContent()).includes('is a particularly good choice for this pizza'))
check('jump to recipe is removed', await desktop.getByRole('link', { name: 'Jump to Recipe' }).count() === 0)
check('recipes have no Adjust recipe control', await desktop.getByRole('button', { name: /Adjust recipe/i }).count() === 0 && await desktop.locator('[data-recipe-adjustment]').count() === 0)
await desktop.locator('[data-recipe-kitchen]').getByRole('link').first().waitFor()
check('the calculator lives in your Notebook', await desktop.locator('[data-recipe-kitchen] a[href="/notebook/new-york-style-pizza"]').count() === 1, await desktop.locator('[data-recipe-kitchen]').textContent())
check('recipe controls appear once in the header', await desktop.getByRole('button', { name: 'Cooking view' }).count() === 1 && await desktop.getByRole('button', { name: 'Print Recipe' }).count() === 1 && await desktop.getByRole('link', { name: 'Pin Recipe' }).count() === 1 && await desktop.getByRole('switch', { name: 'Cook Mode' }).count() === 0)
check('recipes start with one pizza today', (await desktop.locator('[data-today-batch]').textContent()).includes('Making 1 pizza today') && !desktop.url().includes('count='))
await desktop.getByRole('button', { name: 'More pizzas' }).click()
await desktop.getByRole('button', { name: 'More pizzas' }).click()
const authoredPizzaText = await desktop.locator('#recipe-card').textContent()
check('pizza toppings show readable per-pizza and batch totals', authoredPizzaText.includes('6 oz pizza sauce (18 oz total)') && authoredPizzaText.includes('28 g optional pecorino romano (84 g total)') && authoredPizzaText.includes('⅛ tsp optional dried oregano (⅜ tsp total)'))
check('outdoor mixing omits unused optional ingredients', authoredPizzaText.includes('Add the water, flour, fine sea salt, and SAF red instant yeast to the spiral mixer'))
check('recipes always show the authored formula', authoredPizzaText.includes('861g Kirkland Organic All-Purpose Flour') && authoredPizzaText.includes('560g water') && authoredPizzaText.includes('¾ tsp (2.15g) SAF red instant yeast') && authoredPizzaText.includes('17.2g fine sea salt'))
await desktop.getByRole('button', { name: 'More pizzas' }).click()
const fourPizzas = await desktop.locator('#recipe-card').textContent()
check('the count stepper rescales the recipe for today', fourPizzas.includes('Making 4 pizzas today') && fourPizzas.includes('(24 oz total)') && !fourPizzas.includes('861g Kirkland') && desktop.url().endsWith('?count=4'), desktop.url())
await desktop.reload({ waitUntil: 'networkidle' })
await desktop.getByText('Making 4 pizzas today').waitFor()
check('today\'s count survives a reload', (await desktop.locator('#recipe-card').textContent()).includes('(24 oz total)'))
await desktop.getByRole('button', { name: 'Fewer pizzas' }).click()
check('stepping back to the written count restores the authored formula', (await desktop.locator('#recipe-card').textContent()).includes('861g Kirkland'))
await desktop.getByRole('button', { name: 'Fewer pizzas' }).click()
await desktop.getByRole('button', { name: 'Fewer pizzas' }).click()
check('returning to one pizza clears the URL', !desktop.url().includes('count='), desktop.url())
// Formulas shared before Notebook open there as an unsaved copy.
await desktop.goto(`${BASE}/recipes/new-york-style-pizza?config=${encodeURIComponent('{"version":1}')}`, { waitUntil: 'networkidle' })
check('shared formula links open in your Notebook', new URL(desktop.url()).pathname === '/notebook/new-york-style-pizza' && desktop.url().includes('config='), desktop.url())
await desktop.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
const readingLayout = await desktop.evaluate(() => ['.yeet > header', '.yeet main', '.yeet main > article'].map((selector) => {
  const rect = document.querySelector(selector).getBoundingClientRect()
  return { selector, left: rect.left, width: rect.width }
}))
await desktop.getByRole('button', { name: 'Cooking view' }).click()
await desktop.waitForTimeout(200)
check('cooking view enables cook mode', await desktop.locator('.yeet[data-cook-mode="true"]').count() === 1)
check('start cooking hides browse sidebar', await desktop.locator('[data-yeet-browse]').count() === 0)
check('focused cooking exposes the active button state', await desktop.getByRole('button', { name: 'Cooking view' }).getAttribute('aria-pressed') === 'true')
check('Cooking view preserves horizontal page geometry', await desktop.evaluate((before) => before.every(({ selector, left, width }) => {
  const rect = document.querySelector(selector).getBoundingClientRect()
  return Math.abs(rect.left - left) <= 1 && Math.abs(rect.width - width) <= 1
}), readingLayout))
const breadcrumbText = (await desktop.getByRole('navigation', { name: 'Breadcrumb' }).textContent()).replace(/\s+/g, '')
check('recipe breadcrumb omits ambiguous course category', breadcrumbText === 'Home>Recipes>NewYorkStylePizza' && !breadcrumbText.includes('Mains'))
check(
  'focused cooking aligns the recipe body with its description',
  await desktop.evaluate(() => {
    const description = document.querySelector('.yeet > header p')
    const card = document.querySelector('.yeet main > article')
    if (!description || !card) return false

    const descriptionBox = description.getBoundingClientRect()
    const cardBox = card.getBoundingClientRect()
    return Math.abs(descriptionBox.left - cardBox.left) <= 2 && Math.abs(descriptionBox.right - cardBox.right) <= 2
  }),
)
await desktop.close()

const sourdough = await newPage()
await sourdough.goto(`${BASE}/recipes/sourdough-bread?count=2`, { waitUntil: 'networkidle' })
const sourdoughRecipeText = await sourdough.locator('#recipe-card').textContent()
check('resolved sourdough removes fixed starter maintenance quantities', !sourdoughRecipeText.includes('6g starter') && !sourdoughRecipeText.includes('50g starter'))
check('instruction bindings agree with applied recipe rounding', sourdoughRecipeText.includes('first portion of water (685g)') && sourdoughRecipeText.includes('remaining water (20g)'))
check('sourdough recipe has no calculator sheet', await sourdough.getByRole('button', { name: /Adjust recipe/i }).count() === 0)
await sourdough.close()

const phone = await newPage({ width: 390, height: 900 })
await phone.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
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
