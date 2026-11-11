/**
 * Focused coverage for the registry-backed block page surface.
 *
 * Static assertions only prove that files exist. This opens every canonical
 * recipe route and checks that the route renders the generic article shell,
 * registered recipe block, plum ingredients card, active step, mobile/cook-mode
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

async function newPage(viewport = { width: 1440, height: 1000 }, touch = false) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width < 700 ? 2 : 1, ...(touch ? { hasTouch: true, isMobile: true } : {}) })
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
        (button.getAttribute('aria-label') ?? button.textContent)?.includes('Print'),
      ).length,
      cookingButtons: Array.from(document.querySelectorAll('button')).filter((button) =>
        (button.getAttribute('aria-label') ?? button.textContent)?.includes('Cooking view'),
      ).length,
      browseCards: document.querySelectorAll('[data-yeet-browse] a[href^="/recipes/"]').length,
      titleVisible: text('h1') === expectedTitle,
    }
  }, recipe.title)

  check(`${recipe.slug} renders generic block page`, facts.hasNewRecipe && !facts.hasOldRecipe, JSON.stringify(facts))
  check(`${recipe.slug} has matching h1`, facts.titleVisible, `${facts.h1} !== ${recipe.title}`)
  check(`${recipe.slug} renders recipe card`, facts.hasRecipeCard)
  check(`${recipe.slug} does not render duplicate side actions`, facts.shareRailCount === 0, JSON.stringify(facts))
  check(`${recipe.slug} has one print control and one dedicated cooking button`, facts.printButtons === 1 && facts.cookingButtons === 1, JSON.stringify(facts))
  check(`${recipe.slug} has no browse sidebar`, facts.browseCards === 0, JSON.stringify(facts))

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
check('the calculator lives in your Notebook', await desktop.locator('[data-recipe-kitchen] a[href="/remix/new-york-style-pizza"]').count() === 1, await desktop.locator('[data-recipe-kitchen]').textContent())
check('recipe title and byline use their type scale', await desktop.evaluate(() => { const h = document.querySelector('h1'); const b = document.querySelector('[data-slot="eyebrow"]'); return parseFloat(getComputedStyle(h).fontSize) >= 38 && parseFloat(getComputedStyle(b).fontSize) <= 13 }))
check('recipe controls appear once in the header', await desktop.getByRole('button', { name: 'Cooking view' }).count() === 1 && await desktop.getByRole('button', { name: 'Print Recipe' }).count() === 1 && await desktop.getByRole('link', { name: 'Pin Recipe' }).count() === 0 && await desktop.getByRole('switch', { name: 'Cook Mode' }).count() === 0)
check('recipes start with one pizza today', (await desktop.locator('[data-today-batch]').textContent()).includes('Making 1 pizza today') && !desktop.url().includes('count='))
const onePizzaText = await desktop.locator('#recipe-card').textContent()
check('one pizza lists toppings without batch totals', onePizzaText.includes('6 oz pizza sauce') && !onePizzaText.includes(' total)') && onePizzaText.includes('makes one '), onePizzaText.slice(0, 600))
await desktop.getByRole('button', { name: 'More pizzas' }).click()
await desktop.getByRole('button', { name: 'More pizzas' }).click()
const authoredPizzaText = await desktop.locator('#recipe-card').textContent()
check('pizza toppings show readable per-pizza and batch totals', authoredPizzaText.includes('6 oz pizza sauce (18 oz total)') && !/romano/i.test(authoredPizzaText) && authoredPizzaText.includes('⅛ tsp optional dried oregano (⅜ tsp total)'))
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
check('shared formula links open in your Notebook', new URL(desktop.url()).pathname === '/remix/new-york-style-pizza' && desktop.url().includes('config='), desktop.url())
await desktop.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
const readingLayout = await desktop.evaluate(() => ['.yeet header', '.yeet main', '.yeet main > article'].map((selector) => {
  const rect = document.querySelector(selector).getBoundingClientRect()
  return { selector, left: rect.left, width: rect.width }
}))
// Clicks before hydration are lost under load, so wait until React owns the button.
await desktop.waitForFunction(() => { const el = document.querySelector('[data-recipe-action="Cooking view"]'); return el && Object.keys(el).some((key) => key.startsWith('__reactProps')) })
await desktop.getByRole('button', { name: 'Cooking view' }).click()
await desktop.locator('.yeet[data-cook-mode="true"]').waitFor({ timeout: 5000 }).catch(() => {})
await desktop.waitForTimeout(1500) // past the hint's delay: it must stay retired
check('cooking view enables cook mode', await desktop.locator('.yeet[data-cook-mode="true"]').count() === 1)
check('using Cooking view retires its first-visit hint', await desktop.locator('[data-cooking-view-hint]').count() === 0 && await desktop.evaluate(() => localStorage.getItem('eatyeet:hint:cooking-view')) === '1')
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
    const description = document.querySelector('.yeet header p')
    const card = document.querySelector('.yeet main > article')
    if (!description || !card) return false

    const descriptionBox = description.getBoundingClientRect()
    const cardBox = card.getBoundingClientRect()
    return Math.abs(descriptionBox.left - cardBox.left) <= 2
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
check('ingredients sit on the plum card', await phone.locator('[data-ingredients-card]').evaluate((el) => getComputedStyle(el).backgroundColor !== 'rgb(255, 255, 255)'))
check('ingredient amounts are emphasized', await phone.locator('[data-ingredients-card] strong').first().textContent() === '287g')
await phone.waitForFunction(() => { const el = document.querySelector('[data-timed-steps] li'); return el && Object.keys(el).some((key) => key.startsWith('__reactProps')) })
const timedSteps = phone.locator('[data-timed-steps] > li')
await timedSteps.nth(1).click({ position: { x: 200, y: 10 } })
check('tapping a step marks it as the one you are on', await timedSteps.nth(1).getAttribute('aria-current') === 'step')
check('steps before the marked one read as done', await timedSteps.nth(0).getAttribute('data-step-state') === 'done')
await timedSteps.nth(1).getByRole('button').click()
check('tapping the marked step again clears it', await phone.locator('[aria-current="step"]').count() === 0)
await timedSteps.nth(1).click({ position: { x: 200, y: 10 } })
await phone.reload({ waitUntil: 'networkidle' })
await phone.waitForFunction(() => { const el = document.querySelector('[data-timed-steps] li'); return el && Object.keys(el).some((key) => key.startsWith('__reactProps')) })
check('a marked step is forgotten when you come back', await phone.locator('[aria-current="step"], [data-step-state="done"]').count() === 0)
await phone.emulateMedia({ media: 'print' })
check('print shows ingredients on plain white', await phone.locator('[data-ingredients-card]').evaluate((el) => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)'))
await phone.close()

// Cook mode: touch phones and tablets open a full-screen gather-then-cook flow from the chef's hat.
for (const [device, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 1180, height: 820 }]]) {
  const cook = await newPage(viewport, true)
  await cook.goto(`${BASE}/recipes/classic-pink-sugar-cookies`, { waitUntil: 'networkidle' })
  await cook.waitForFunction(() => { const el = document.querySelector('[data-recipe-action="Cooking view"]'); return el && Object.keys(el).some((key) => key.startsWith('__reactProps')) })
  await cook.getByRole('button', { name: 'Cooking view' }).click()
  const sheet = cook.getByRole('dialog', { name: /Cook mode/ })
  check(`${device}: the chef's hat opens cook mode on the intro`, await sheet.isVisible() && await sheet.getAttribute('data-cook-stage') === 'intro' && await sheet.getByRole('heading', { name: /get cooking/ }).count() === 1)
  check(`${device}: the intro fits the screen`, await sheet.evaluate((el) => el.scrollWidth <= innerWidth && el.getBoundingClientRect().height <= innerHeight))
  await sheet.getByRole('button', { name: /Gather ingredients/ }).click()
  check(`${device}: Gather ingredients opens the checklist`, await sheet.getAttribute('data-cook-stage') === 'gather' && await sheet.getByRole('heading', { name: 'Gather your ingredients' }).count() === 1 && /Gather · 0 of \d+/.test(await sheet.locator('header').textContent()))
  const group = sheet.locator('[data-cook-group]').first()
  const items = group.getByRole('checkbox')
  const count = await items.count()
  for (let i = 0; i < count; i++) await items.nth(i).click()
  check(`${device}: checking an item marks it`, await items.first().getAttribute('aria-checked') === 'true')
  await items.first().click()
  await cook.waitForTimeout(1300)
  check(`${device}: unchecking within the pause keeps a group open`, await group.getByRole('checkbox').count() === count)
  await items.first().click()
  await cook.waitForTimeout(1300)
  const header = group.getByRole('button', { expanded: false })
  check(`${device}: a finished group folds away`, await header.count() === 1 && await group.getByRole('checkbox').count() === 0)
  await header.click()
  check(`${device}: tapping a folded group reopens it with checks kept`, await group.getByRole('checkbox').count() === count && await group.getByRole('checkbox', { checked: true }).count() === count)
  const fits = await sheet.evaluate((el) => el.scrollWidth <= innerWidth && el.getBoundingClientRect().height <= innerHeight)
  check(`${device}: cook mode fits the screen`, fits)
  await sheet.getByRole('button', { name: /Start cooking/ }).click()
  check(`${device}: Start cooking shows the first step`, await sheet.getAttribute('data-cook-stage') === 'cook' && /Step 1 of/.test(await sheet.locator('header').textContent()))
  await sheet.getByRole('button', { name: 'Next' }).click()
  check(`${device}: Next advances a step`, /Step 2 of/.test(await sheet.locator('header').textContent()))
  check(`${device}: the step label fits without truncation`, await sheet.locator('header p').evaluate((el) => el.scrollWidth <= el.clientWidth) && await sheet.locator('header').getByRole('button', { name: 'Classic view' }).count() === 0)
  let timer = sheet.getByRole('button', { name: /^Start .* timer$/ })
  while (!(await timer.count())) { await sheet.getByRole('button', { name: 'Next' }).click(); timer = sheet.getByRole('button', { name: /^Start .* timer$/ }) }
  await timer.first().click()
  check(`${device}: a step time starts a docked timer`, await sheet.getByRole('list', { name: 'Timers' }).getByRole('button').count() === 1)
  await sheet.getByRole('button', { name: 'Exit cook mode' }).click()
  check(`${device}: Exit returns to the recipe`, !(await sheet.isVisible()))
  await cook.getByRole('button', { name: 'Cooking view' }).click()
  check(`${device}: Exit keeps your place`, await sheet.getAttribute('data-cook-stage') === 'cook' && await sheet.getByRole('list', { name: 'Timers' }).count() === 1)
  while (await sheet.getAttribute('data-cook-stage') === 'cook') await sheet.getByRole('button', { name: /^(Next|Finish)$/ }).click()
  await sheet.getByRole('button', { name: 'Back to recipe' }).click()
  await cook.getByRole('button', { name: 'Cooking view' }).click()
  check(`${device}: finishing resets cook mode`, await sheet.getAttribute('data-cook-stage') === 'intro' && await sheet.getByRole('list', { name: 'Timers' }).count() === 0)
  await sheet.getByRole('button', { name: /Gather ingredients/ }).click()
  check(`${device}: finishing clears the checklist`, await sheet.getByRole('checkbox', { checked: true }).count() === 0 && await sheet.getByRole('list', { name: 'Timers' }).count() === 0)
  await sheet.getByRole('button', { name: 'Classic view' }).click()
  check(`${device}: Classic view opts out to the focused page`, !(await sheet.isVisible()) && await cook.locator('[data-focused-cooking="true"]').count() === 1)
  await cook.getByRole('button', { name: 'Cooking view' }).click()
  await cook.getByRole('button', { name: 'Cooking view' }).click()
  check(`${device}: the opt-out is remembered`, !(await sheet.isVisible()) && await cook.locator('[data-focused-cooking="true"]').count() === 1)
  await cook.getByRole('button', { name: 'Switch to step-by-step cook mode' }).click()
  check(`${device}: classic view switches back to step-by-step`, await sheet.isVisible() && await cook.evaluate(() => localStorage.getItem('eatyeet:cook-mode:classic')) === null)
  await cook.close()
}

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
