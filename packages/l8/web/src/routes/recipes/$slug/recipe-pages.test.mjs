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

import { RESOLVED_APP_PATHS } from '#web-test/app-paths'
import { startStatic } from '#web-test/static-server'

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
      cookSwitches: document.querySelectorAll('[role="switch"]').length,
      browseCards: document.querySelectorAll('[data-yeet-browse] a[href^="/recipes/"]').length,
      sidebarDisplay: getComputedStyle(document.querySelector('[data-yeet-browse]')).display,
      titleVisible: text('h1') === expectedTitle,
    }
  }, recipe.title)

  check(`${recipe.slug} renders generic block page`, facts.hasNewRecipe && !facts.hasOldRecipe, JSON.stringify(facts))
  check(`${recipe.slug} has matching h1`, facts.titleVisible, `${facts.h1} !== ${recipe.title}`)
  check(`${recipe.slug} renders recipe card`, facts.hasRecipeCard)
  check(`${recipe.slug} does not render duplicate side actions`, facts.shareRailCount === 0, JSON.stringify(facts))
  check(`${recipe.slug} has print controls and dedicated cooking switches`, facts.printButtons >= 2 && facts.cookSwitches === 2, JSON.stringify(facts))
  check(`${recipe.slug} shows desktop browse sidebar`, facts.sidebarDisplay === 'block' && facts.browseCards === 4, JSON.stringify(facts))

  await page.close()
}

const desktop = await newPage()
await desktop.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
check(
  'variant selector is removed',
  await desktop.locator('[aria-label="Recipe variants"]').count() === 0,
)
check('pizza shows applied configuration', (await desktop.locator('text=3 balls × 480g').count()) > 0)
check('pizza uses the authored mozzarella', (await desktop.locator('#recipe-card').textContent()).includes("Trader Joe's whole milk low moisture mozzarella"))
check('pizza no longer requires frozen provolone', !(await desktop.locator('#recipe-card').textContent()).toLowerCase().includes('provolone'))
check('pizza links the recommended mozzarella', await desktop.locator('#recipe-card a[href*="traderjoes.com/home/search"]').count() === 1)
check('pizza recommends the selected mozzarella', (await desktop.locator('#recipe-card').textContent()).includes('is a particularly good choice for this pizza'))
check('jump to recipe is removed', await desktop.getByRole('link', { name: 'Jump to Recipe' }).count() === 0)
check('adjust recipe appears only beside the recipe', await desktop.getByRole('button', { name: 'Adjust Recipe' }).count() === 1)
check('cook mode is a switch beside the recipe', await desktop.getByRole('switch', { name: 'Cook Mode' }).getAttribute('aria-checked') === 'false')
const authoredPizzaText = await desktop.locator('#recipe-card').textContent()
check('pizza toppings show readable per-pizza and batch totals', authoredPizzaText.includes('6 oz pizza sauce (18 oz total)') && authoredPizzaText.includes('28 g pecorino romano (84 g total)') && authoredPizzaText.includes('⅛ tsp dried oregano (⅜ tsp total)'))
check('outdoor mixing omits unused optional ingredients', authoredPizzaText.includes('Add the water, flour, salt, and yeast to the spiral mixer'))
await desktop.getByRole('button', { name: 'Adjust Recipe' }).first().click()
check('workbench opens as a dialog', await desktop.getByRole('dialog', { name: 'Adjust recipe' }).isVisible())
check('target inputs pin percent units', (await desktop.getByText('%', { exact: true }).count()) >= 3)
const workbenchEdge = await desktop.getByRole('dialog', { name: 'Adjust recipe' }).evaluate((drawer) => ({ borderLeft: getComputedStyle(drawer).borderLeftWidth, hasPinkOffsetShadow: drawer.className.includes('shadow-[-18px') }))
check('workbench has no decorative pink edge or hard left border', workbenchEdge.borderLeft === '0px' && !workbenchEdge.hasPinkOffsetShadow, JSON.stringify(workbenchEdge))
check('saved formulas start collapsed', await desktop.getByRole('button', { name: /Saved formulas/ }).getAttribute('aria-expanded') === 'false')
await desktop.getByRole('button', { name: /Saved formulas/ }).click()
check('saved formula disclosure reveals the form', await desktop.getByRole('heading', { name: 'Saved formulas' }).isVisible())
await desktop.getByLabel('Formula preset name').fill('Outdoor favorite')
await desktop.getByRole('button', { name: 'Save new' }).click()
check('saved formula has an explicit recall action', await desktop.getByRole('button', { name: 'Load Outdoor favorite' }).isVisible())
check('saved formula reports when its exact values are loaded', await desktop.getByText('Loaded', { exact: true }).isVisible())
await desktop.getByLabel('Oven method').selectOption('indoor-steel')
await desktop.getByRole('button', { name: 'Use recommended formula for Indoor Steel' }).click()
check('using a recommended formula clears the saved-formula identity', await desktop.getByText('Loaded', { exact: true }).count() === 0 && await desktop.getByText('Modified', { exact: true }).count() === 0)
await desktop.getByRole('button', { name: 'Apply to recipe' }).click()
await desktop.waitForURL('**/recipes/new-york-style-pizza?config=*')
const indoorFacts = await desktop.evaluate(() => document.body.textContent ?? '')
check('applied configuration updates URL', desktop.url().includes('?config='), desktop.url())
check('indoor method applies calculated dough formula', indoorFacts.includes('851g King Arthur High-Gluten Flour') && indoorFacts.includes('17g oil'))
check('indoor mixing includes configured oil', indoorFacts.includes('Add the water, flour, oil, salt, and yeast to the spiral mixer'))
check('indoor method shows baking steel equipment', indoorFacts.includes('16&quot; x 16&quot; baking steel') || indoorFacts.includes('16" x 16" baking steel'))
await desktop.goBack()
await desktop.waitForURL('**/recipes/new-york-style-pizza')
const outdoorFacts = await desktop.evaluate(() => document.body.textContent ?? '')
check('browser Back restores authored formula', outdoorFacts.includes('846g Kirkland Organic All-Purpose Flour') && outdoorFacts.includes('575g water') && outdoorFacts.includes('2.11g instant yeast') && outdoorFacts.includes('16.9g salt'), outdoorFacts.slice(outdoorFacts.indexOf('Ingredients'), outdoorFacts.indexOf('Instructions')))
await desktop.getByRole('button', { name: 'Adjust Recipe' }).first().click()
await desktop.getByLabel('Hydration').fill('71')
await desktop.getByRole('button', { name: 'Cancel' }).click()
check('cancel discards draft', (await desktop.locator('text=68% hydration').count()) > 0)
const cookActionsHeight = await desktop.locator('[data-recipe-card-actions]').evaluate((actions) => actions.getBoundingClientRect().height)
await desktop.getByRole('switch', { name: 'Cook Mode' }).click()
await desktop.waitForTimeout(200)
const activeCookActionsHeight = await desktop.locator('[data-recipe-card-actions]').evaluate((actions) => actions.getBoundingClientRect().height)
check('cook-mode switch does not change action-row padding', Math.abs(activeCookActionsHeight - cookActionsHeight) < 1, `${cookActionsHeight} -> ${activeCookActionsHeight}`)
check(
  'recipe-card cook mode keeps surrounding content in place',
  await desktop.locator('[data-yeet-browse]').count() === 1,
)
check(
  'cook mode marks article root',
  await desktop.locator('.yeet[data-cook-mode="true"]').count() === 1,
)
const readingLayout = await desktop.evaluate(() => ['.yeet > header', '.yeet main', '.yeet main > article'].map((selector) => {
  const rect = document.querySelector(selector).getBoundingClientRect()
  return { selector, left: rect.left, width: rect.width }
}))
await desktop.getByRole('switch', { name: 'Cooking view' }).click()
await desktop.waitForTimeout(200)
check('start cooking enables cook mode', await desktop.getByRole('switch', { name: 'Cook Mode' }).getAttribute('aria-checked') === 'true')
check('start cooking hides browse sidebar', await desktop.locator('[data-yeet-browse]').count() === 0)
check('focused cooking offers a switch back to the article', await desktop.getByRole('switch', { name: 'Cooking view' }).getAttribute('aria-checked') === 'true')
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
await sourdough.goto(`${BASE}/recipes/sourdough-bread`, { waitUntil: 'networkidle' })
const sourdoughRecipeText = await sourdough.locator('#recipe-card').textContent()
check('resolved sourdough removes fixed starter maintenance quantities', !sourdoughRecipeText.includes('6g starter') && !sourdoughRecipeText.includes('50g starter'))
check('instruction bindings agree with applied recipe rounding', sourdoughRecipeText.includes('first portion of water (685g)') && sourdoughRecipeText.includes('remaining water (20g)'))
const adjustSourdough = sourdough.getByRole('button', { name: 'Adjust Recipe' }).first()
await adjustSourdough.click()
const sourdoughDialog = sourdough.getByRole('dialog', { name: 'Adjust recipe' })
check('sourdough starts in ingredient weights', await sourdough.getByRole('button', { name: 'Weights' }).getAttribute('aria-pressed') === 'true')
check('sourdough defaults to 77 percent starter hydration', await sourdough.getByLabel('Starter hydration').inputValue() === '77')
check('sourdough migration weights survive display rounding',
  Math.abs(Number(await sourdough.getByLabel('Bread flour grams').first().inputValue()) - 765) < 0.01 &&
  Math.abs(Number(await sourdough.getByLabel('Whole wheat flour grams').first().inputValue()) - 150) < 0.01 &&
  Math.abs(Number(await sourdough.getByLabel('Added water').inputValue()) - 705) < 0.01 &&
  Math.abs(Number(await sourdough.getByLabel('Ripe starter weight').inputValue()) - 175) < 0.01)
await sourdough.getByRole('button', { name: 'Target batch' }).click()
check('target formula uses readable rounded percentages',
  Math.abs(Number(await sourdough.getByRole('textbox', { name: 'Hydration', exact: true }).inputValue()) - 77) < 0.01 &&
  Math.abs(Number(await sourdough.getByLabel('Salt').inputValue()) - 2) < 0.01 &&
  Math.abs(Number(await sourdough.getByLabel('Ripe levain').inputValue()) - 17.3) < 0.01)
await sourdough.getByRole('button', { name: 'Add flour' }).first().click()
await sourdough.getByLabel('Flour 3 name').fill('Rye')
await sourdough.getByLabel('Rye percentage').fill('10')
check('invalid flour blend disables apply', await sourdough.getByRole('button', { name: 'Apply to recipe' }).isDisabled())
check('invalid flour blend explains its total', (await sourdoughDialog.getByRole('alert').textContent()).includes('must total 100%'))
await sourdough.keyboard.press('Meta+k')
check('search shortcut does not stack another modal', await sourdough.getByRole('dialog').count() === 1)
await sourdough.keyboard.press('Escape')
await sourdough.waitForTimeout(200)
check('escape closes workbench and restores focus', await sourdoughDialog.isHidden() && await adjustSourdough.evaluate((button) => document.activeElement === button))
await sourdough.close()

const phone = await newPage({ width: 390, height: 900 })
await phone.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
check(
  'recipe browse sidebar hidden on phone',
  await phone.locator('[data-yeet-browse]').evaluate((el) => getComputedStyle(el).display === 'none'),
)
await phone.getByRole('button', { name: 'Adjust Recipe' }).first().click()
await phone.waitForTimeout(150)
const phoneDrawer = await phone.getByRole('dialog', { name: 'Adjust recipe' }).evaluate((dialog) => ({
  width: dialog.getBoundingClientRect().width,
  left: dialog.getBoundingClientRect().left,
  viewport: window.innerWidth,
  maxWidth: getComputedStyle(dialog).maxWidth,
}))
check('workbench fills phone viewport', Math.abs(phoneDrawer.width - phoneDrawer.viewport) < 2, JSON.stringify(phoneDrawer))
const phoneScrollRegion = await phone.locator('[data-workbench-scroll-region]').evaluate((region) => ({
  clientWidth: region.clientWidth,
  scrollWidth: region.scrollWidth,
  overflowX: getComputedStyle(region).overflowX,
  touchAction: getComputedStyle(region).touchAction,
}))
check(
  'workbench scroll region stays locked to vertical touch movement',
  phoneScrollRegion.scrollWidth === phoneScrollRegion.clientWidth &&
    phoneScrollRegion.overflowX === 'hidden' &&
    phoneScrollRegion.touchAction === 'pan-y',
  JSON.stringify(phoneScrollRegion),
)
await phone.getByRole('button', { name: 'Cancel' }).click()
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
