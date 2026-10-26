/**
 * Notebook in a real browser: the signed-out calculator, saving through
 * sign-in, autosave and History, duplicate, delete with undo, bake sheets and
 * phone layouts. Runs against the production build with a local test member.
 */
import { signIn } from '#web-test/member-session'
import { chromium } from 'playwright'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { startApp } from '#web-test/static-server'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', '..')
const server = await startApp(join(ROOT, '.output', 'public'))
const BASE = server.url.replace(/\/$/, '')
const browser = await chromium.launch()
const results = []
const errors = []
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: ok ? '' : detail })

async function open(context, path) {
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  // The duplicate-name check deliberately receives a 409; the browser logs it.
  page.on('console', (message) => message.type() === 'error' && !/status of 409/.test(message.text()) && errors.push(message.text()))
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  return page
}
const dough = (page) => page.locator('aside [data-dough-results]')
const savedAfter = (page) => page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('/api/public/account/kitchen/formulas/'), { timeout: 10000 })

try {
  // Signed out: the calculator works, keeps work in this browser, and saving signs in first.
  const visitor = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const sessionReads = []
  visitor.on('request', (request) => request.url().includes('/api/public/account/') && sessionReads.push(request.url()))
  let page = await open(visitor, '/notebook')
  check('library introduces Notebook to visitors', await page.getByRole('heading', { level: 1, name: 'Notebook' }).isVisible() && await page.locator('[data-kitchen-start]').count() === 2)
  check('nav links to Notebook', await page.locator('nav a[href="/notebook"]').first().isVisible())
  await page.locator('[data-kitchen-start="new-york-style-pizza"]').click()
  await page.waitForURL('**/notebook/new-york-style-pizza')
  await page.waitForLoadState('networkidle')
  check('scratch starts from the recipe as written', (await dough(page).textContent()).includes('861g') && (await page.getByRole('region', { name: 'Changed from the recipe' }).textContent()).includes('matches the recipe'))
  await page.getByRole('textbox', { name: 'Hydration' }).fill('68')
  check('weights update while typing', (await dough(page).textContent()).includes('846g'), await dough(page).textContent())
  check('the change is listed against the recipe', /Hydration\s*was\s*65%\s*now\s*68%/.test(await page.getByRole('region', { name: 'Changed from the recipe' }).textContent()))
  await page.reload({ waitUntil: 'networkidle' })
  check('unsaved work survives a reload in this browser', await page.getByRole('textbox', { name: 'Hydration' }).inputValue() === '68')
  check('anonymous visitors make no account requests', sessionReads.length === 0, sessionReads.join(', '))
  await page.goto(`${BASE}/notebook/new-york-style-pizza/bake?count=5`, { waitUntil: 'networkidle' })
  const scratchBake = await page.locator('#recipe-card').textContent()
  check('scratch bake sheet uses the browser formula and today\'s count', scratchBake.includes('Making 5 pizzas today') && scratchBake.includes('Divide and shape dough into 5 balls'), scratchBake.slice(0, 400))
  await page.goto(`${BASE}/notebook/new-york-style-pizza`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Sign in to save' }).first().click()
  await page.waitForURL('**/account/sign-in**')
  check('saving signs in and returns to the formula', new URL(page.url()).searchParams.get('returnTo') === '/notebook/new-york-style-pizza?save=1', page.url())
  await page.goto(`${BASE}/notebook/sourdough-bread`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Add flour' }).first().click()
  await page.getByLabel('Flour 3 name').fill('Rye')
  await page.getByLabel('Rye percentage').fill('10')
  await page.getByRole('alert').filter({ hasText: 'must total 100%' }).first().waitFor()
  check('an invalid blend blocks saving and explains why', await page.getByRole('button', { name: 'Sign in to save' }).first().isDisabled() && (await page.getByRole('alert').first().textContent()).includes('must total 100%'))
  await visitor.close()

  // Signed in: the typed name and the browser formula save on return from sign-in, with no extra step.
  const member = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await signIn(member, BASE)
  page = await open(member, '/notebook/new-york-style-pizza')
  await page.getByRole('textbox', { name: 'Hydration' }).fill('68')
  await page.getByRole('heading', { level: 1 }).click()
  await page.getByRole('textbox', { name: 'Formula name' }).fill('  Friday   pies ')
  await page.keyboard.press('Escape')
  check('Escape keeps the old name', await page.getByRole('heading', { level: 1 }).textContent() !== 'Friday pies')
  await page.getByRole('button', { name: /^Rename / }).click()
  await page.getByRole('textbox', { name: 'Formula name' }).fill('  Friday   pies ')
  await page.keyboard.press('Enter')
  await page.getByRole('textbox', { name: 'Formula name' }).waitFor({ state: 'detached' })
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor()
  check('the unsaved name stays in this browser', await page.evaluate(() => localStorage.getItem('eatyeet:kitchen:new-york-style-pizza:name')) === 'Friday pies')
  await page.goto(`${BASE}/notebook/new-york-style-pizza?save=1`, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/notebook\/new-york-style-pizza\/[A-Za-z0-9_-]{16}\/bake$/)
  check('returning from sign-in saves without a dialog', await page.getByRole('dialog').count() === 0)
  await page.getByRole('status').filter({ hasText: 'Saved to Notebook' }).waitFor()
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor()
  check('saving opens the formula\'s bake sheet under its name', (await page.locator('#recipe-card').textContent()).includes('846g Kirkland Organic All-Purpose Flour'))
  await page.getByRole('link', { name: 'Edit formula' }).click()
  await page.waitForURL(/\/notebook\/new-york-style-pizza\/[A-Za-z0-9_-]{16}$/)
  const formulaUrl = page.url()
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor()
  check('Edit formula opens the editor', await page.getByRole('textbox', { name: 'Hydration' }).inputValue() === '68')
  check('saving clears the browser copy', await page.evaluate(() => localStorage.getItem('eatyeet:kitchen:new-york-style-pizza')) === null)

  // Autosave, the change strip and the Saved label.
  const yeastSaved = savedAfter(page)
  await page.getByRole('textbox', { name: 'SAF red instant yeast' }).fill('0.2')
  check('edits save automatically', (await yeastSaved).ok())
  await page.locator('[data-save-status="saved"]').first().waitFor()
  check('the page confirms the save', (await page.locator('[data-save-status]').first().textContent()).includes('Saved'))
  check('changes from the recipe are listed', /Yeast\s*was\s*0\.25%\s*now\s*0\.2%/.test(await page.getByRole('region', { name: 'Changed from the recipe' }).textContent()))

  // The method's recommended formula writes oil and baking steel into the bake sheet.
  const ovenSaved = savedAfter(page)
  await page.getByRole('button', { name: 'Indoor Steel' }).click()
  await page.getByRole('button', { name: 'Use the recommended formula for Indoor Steel' }).click()
  await ovenSaved
  await page.waitForTimeout(1200)
  await page.goto(`${formulaUrl}/bake`, { waitUntil: 'networkidle' })
  await page.locator('#recipe-card').waitFor()
  let bake = await page.locator('#recipe-card').textContent()
  check('bake sheet applies the formula', bake.includes('861g Kirkland Organic All-Purpose Flour') && bake.includes('542g water') && bake.includes('17.2g oil'), bake.slice(0, 600))
  check('bake sheet mixing includes the oil', bake.includes('Add the water, flour, oil, fine sea salt, and SAF red instant yeast to the spiral mixer'))
  check('bake sheet shows the method equipment', bake.includes('baking steel'))
  check('bake sheet is titled by the formula', await page.getByRole('heading', { level: 1, name: 'Friday pies' }).isVisible() && await page.getByRole('link', { name: 'Pin Recipe' }).count() === 0)
  await page.getByRole('button', { name: 'Rename Friday pies' }).click()
  await page.getByRole('textbox', { name: 'Formula name' }).fill('Friday night pies')
  await page.keyboard.press('Enter')
  await page.getByRole('textbox', { name: 'Formula name' }).waitFor({ state: 'detached' })
  await page.getByRole('heading', { level: 1, name: 'Friday night pies' }).waitFor()
  await page.reload({ waitUntil: 'networkidle' })
  check('the bake sheet renames in place', await page.getByRole('heading', { level: 1, name: 'Friday night pies' }).isVisible())
  await page.getByRole('heading', { level: 1 }).click()
  await page.getByRole('textbox', { name: 'Formula name' }).fill('Friday pies')
  await page.keyboard.press('Enter')
  await page.getByRole('textbox', { name: 'Formula name' }).waitFor({ state: 'detached' })
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor()
  await page.getByRole('button', { name: 'More pizzas' }).click()
  bake = await page.locator('#recipe-card').textContent()
  check('today\'s batch scales the bake sheet only', bake.includes('Making 4 pizzas today') && bake.includes('The usual batch for Friday pies is 3.') && page.url().endsWith('/bake?count=4'), bake.slice(0, 300))
  await page.goto(formulaUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor()
  check('the formula keeps its usual batch', await page.getByRole('textbox', { name: 'Pizzas' }).inputValue() === '3')

  // History restores any version, and the restore can be undone.
  await page.getByRole('button', { name: 'History' }).first().click()
  const history = page.locator('[data-kitchen-history]')
  await history.waitFor()
  check('History lists the created and edited versions', (await history.textContent()).includes('Created') && (await history.textContent()).includes('Current'))
  await history.getByRole('button', { name: /^Restore the version/ }).last().click()
  await history.waitFor({ state: 'hidden' })
  await page.getByRole('status').filter({ hasText: 'Restored the version' }).waitFor()
  check('restoring brings back the earlier values', await page.getByRole('textbox', { name: 'SAF red instant yeast' }).inputValue() === '0.25')
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.waitForFunction(() => document.querySelector('input[inputmode="decimal"]') && [...document.querySelectorAll('label')].some((label) => label.textContent === 'Oil'))
  await page.waitForTimeout(800)
  check('a restore can be undone', await page.getByRole('textbox', { name: 'Oil' }).inputValue() === '2', await page.getByRole('textbox', { name: 'Oil' }).inputValue())

  // Duplicate opens the copy at once under the next free name, ready to rename; names stay unique.
  await page.getByRole('button', { name: 'Duplicate' }).click()
  await page.waitForURL((url) => url.href !== formulaUrl && /\/notebook\/new-york-style-pizza\/[A-Za-z0-9_-]{16}$/.test(url.pathname))
  const copyName = page.getByRole('textbox', { name: 'Formula name' })
  await copyName.waitFor()
  check('the copy opens with its name selected', await copyName.inputValue() === 'Friday pies copy' && await copyName.evaluate((input) => document.activeElement === input && input.selectionStart === 0 && input.selectionEnd === input.value.length))
  await copyName.fill('friday PIES')
  await page.keyboard.press('Enter')
  await page.getByRole('alert').filter({ hasText: 'already have a formula with this name' }).waitFor()
  check('renaming refuses a name already in use', await copyName.inputValue() === 'friday PIES')
  await copyName.fill('Friday pies, wetter')
  await page.keyboard.press('Enter')
  await copyName.waitFor({ state: 'detached' })
  await page.getByRole('heading', { level: 1, name: 'Friday pies, wetter' }).waitFor()
  check('the copy opens as its own formula', await page.getByRole('textbox', { name: 'Hydration' }).inputValue() === '63')

  // Delete moves to Recently deleted with Undo.
  await page.getByRole('button', { name: 'Delete formula' }).click()
  await page.waitForURL('**/notebook?deleted=*')
  await page.getByRole('status').filter({ hasText: 'Deleted Friday pies, wetter' }).waitFor()
  check('deleting returns to the library with Undo', await page.locator('[data-kitchen-formula]').count() === 1)
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('status').filter({ hasText: 'Restored Friday pies, wetter' }).waitFor()
  check('undo restores the deleted formula', await page.locator('[data-kitchen-formula]').count() === 2)
  check('library groups formulas by dough', await page.getByRole('heading', { level: 2, name: /^Pizza/ }).isVisible())
  check('library cards open bake sheets', (await page.locator('[data-kitchen-formula]').first().getAttribute('href')).endsWith('/bake'))

  await page.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
  await page.locator('[data-recipe-kitchen] a[href^="/notebook/new-york-style-pizza/"]').first().waitFor()
  check('the recipe links to the member\'s versions', (await page.locator('[data-recipe-kitchen]').textContent()).includes('Friday pies'))
  await member.close()

  // Phones: no sideways scroll, and the dough total stays docked.
  for (const width of [390, 320]) {
    const phone = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await signIn(phone, BASE)
    page = await open(phone, new URL(formulaUrl).pathname)
    await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`formula page fits ${width}px`, overflow <= 0, `${overflow}px overflow`)
    const dock = page.locator('[data-dough-dock]')
    check(`dough total is docked at ${width}px`, await dock.isVisible() && (await dock.textContent()).includes('1,440g'))
    await dock.getByRole('button', { name: /Your dough/ }).click()
    check(`docked dough expands at ${width}px`, await dock.locator('[data-dough-results]').isVisible())
    page = await open(phone, '/notebook/sourdough-bread')
    check(`sourdough calculator fits ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    await phone.close()
  }
} finally {
  await browser.close()
  await server.close()
}

for (const result of results) console.log(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.name}${result.detail ? ' :: ' + result.detail : ''}`)
if (errors.length) {
  console.log('\nPage errors:')
  for (const error of errors) console.log('  ' + error)
}
const failed = results.filter((result) => !result.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed || errors.length ? 1 : 0)
