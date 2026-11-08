/**
 * Notebook in a real browser: the signed-out calculator, saving in the
 * browser, moving those formulas to the account on sign-in, autosave and History, duplicate, delete with undo, bake sheets and
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

const visitorName = `Visitor pies ${Date.now().toString(36)}`
try {
  // Signed out: the calculator works, keeps work in this browser and saves formulas there without an account.
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
  check('the change is listed against the recipe', /Hydration\s*now\s*68%\s*was 65%/.test(await page.getByRole('region', { name: 'Changed from the recipe' }).textContent()))
  await page.reload({ waitUntil: 'networkidle' })
  check('unsaved work survives a reload in this browser', await page.getByRole('textbox', { name: 'Hydration' }).inputValue() === '68')
  check('anonymous visitors make no account requests', sessionReads.length === 0, sessionReads.join(', '))
  await page.goto(`${BASE}/notebook/new-york-style-pizza/bake?count=5`, { waitUntil: 'networkidle' })
  const scratchBake = await page.locator('#recipe-card').textContent()
  check('scratch bake sheet uses the browser formula and today\'s count', scratchBake.includes('Making 5 pizzas today') && scratchBake.includes('Divide and shape dough into 5 balls'), scratchBake.slice(0, 400))
  await page.goto(`${BASE}/notebook/new-york-style-pizza`, { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Formula name' }).fill(visitorName)
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { level: 1, name: visitorName }).waitFor({ state: 'attached' })
  await page.getByRole('button', { name: 'Save to Notebook' }).first().click()
  await page.waitForURL(/\/notebook\/new-york-style-pizza\/local[A-Za-z0-9]{11}\/bake$/)
  const localBake = page.url()
  await page.getByRole('status').filter({ hasText: 'Saved in this browser' }).waitFor()
  check('visitors save to Notebook without signing in', (await page.locator('#recipe-card').textContent()).includes('Making'))
  await page.getByRole('link', { name: 'Edit formula' }).click()
  await page.waitForURL(/\/local[A-Za-z0-9]{11}$/)
  await page.getByRole('textbox', { name: 'Hydration' }).fill('70')
  await page.locator('[data-save-status="saved"]').filter({ hasText: 'Saved in this browser' }).waitFor()
  check('browser formulas autosave and keep History', await page.getByRole('heading', { name: 'Recent changes' }).isVisible() && await page.getByRole('heading', { name: 'Saved in this browser' }).isVisible())
  await page.goto(`${BASE}/notebook`, { waitUntil: 'networkidle' })
  check('the library lists browser formulas', await page.locator('[data-kitchen-formula]').filter({ hasText: visitorName }).count() === 1)
  await page.goto(`${BASE}/notebook/sourdough-bread`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Add flour' }).first().click()
  await page.getByLabel('Flour 3 name').fill('Rye')
  await page.getByLabel('Rye percentage').fill('10')
  await page.getByRole('alert').filter({ hasText: 'must total 100%' }).first().waitFor()
  check('an invalid blend blocks saving and explains why', await page.getByRole('button', { name: 'Save to Notebook' }).first().isDisabled() && (await page.getByRole('alert').first().textContent()).includes('must total 100%'))
  check('anonymous Notebook use makes no account requests', sessionReads.length === 0, sessionReads.join(', '))

  // Signing in moves browser formulas to the account; old local links still open them.
  await signIn(visitor, BASE)
  page = await open(visitor, '/notebook')
  await page.getByRole('status').filter({ hasText: 'Moved 1 formula from this browser to your account' }).waitFor()
  const movedCard = page.locator('[data-kitchen-formula]').filter({ hasText: visitorName })
  check('moved formulas get account IDs', await movedCard.count() === 1 && !(await movedCard.getAttribute('data-kitchen-formula')).startsWith('local'))
  check('the browser copy is cleared after moving', await page.evaluate(() => localStorage.getItem('eatyeet:kitchen:formulas')) === null)
  await page.goto(localBake, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/notebook\/new-york-style-pizza\/(?!local)[A-Za-z0-9_-]{16}\/bake$/)
  check('old browser links open the moved formula', await page.getByRole('heading', { level: 1, name: visitorName }).isVisible())
  const movedId = new URL(page.url()).pathname.split('/')[3]
  const removed = await page.evaluate((id) => fetch(`/api/public/account/kitchen/formulas/${id}`, { method: 'DELETE', credentials: 'same-origin' }).then((response) => response.ok), movedId)
  check('the moved test formula is cleaned up', removed)
  await visitor.close()

  // Signed in: the typed name and the browser formula save on return from sign-in, with no extra step.
  const member = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await signIn(member, BASE)
  page = await open(member, '/notebook/new-york-style-pizza')
  await page.getByRole('textbox', { name: 'Hydration' }).fill('68')
  const nameField = page.getByRole('textbox', { name: 'Formula name' })
  check('the editor title is the name field', await nameField.inputValue() === 'New York Style Pizza')
  await nameField.fill('  Friday   pies ')
  await page.keyboard.press('Escape')
  check('Escape keeps the old name', await nameField.inputValue() === 'New York Style Pizza' && await page.getByRole('heading', { level: 1 }).textContent() === 'New York Style Pizza')
  await nameField.fill('  Friday   pies ')
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor({ state: 'attached' })
  check('the name is tidied as it saves', await nameField.inputValue() === 'Friday pies')
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
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor({ state: 'attached' })
  check('Edit formula opens the editor', await page.getByRole('textbox', { name: 'Hydration' }).inputValue() === '68')
  check('saving clears the browser copy', await page.evaluate(() => localStorage.getItem('eatyeet:kitchen:new-york-style-pizza')) === null)

  // Autosave, the change strip and the Saved label.
  const yeastSaved = savedAfter(page)
  await page.getByRole('textbox', { name: 'SAF red instant yeast' }).fill('0.2')
  check('edits save automatically', (await yeastSaved).ok())
  await page.locator('[data-save-status="saved"]').first().waitFor()
  check('the page confirms the save', (await page.locator('[data-save-status]').first().textContent()).includes('Saved'))
  check('changes from the recipe are listed', /Yeast\s*now\s*0\.2%\s*was 0\.25%/.test(await page.getByRole('region', { name: 'Changed from the recipe' }).textContent()))

  // The method's recommended formula writes oil and baking steel into the bake sheet.
  const ovenSaved = savedAfter(page)
  await page.getByRole('button', { name: 'Indoor Steel' }).click()
  await page.getByRole('button', { name: 'Use the recommended formula for Indoor Steel' }).click()
  await ovenSaved
  await page.waitForTimeout(1200)
  // The editor's title field renames the formula; it survives a reload.
  await page.getByRole('textbox', { name: 'Formula name' }).fill('Friday night pies')
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { level: 1, name: 'Friday night pies' }).waitFor({ state: 'attached' })
  await page.waitForTimeout(1200)
  await page.reload({ waitUntil: 'networkidle' })
  check('the editor renames in place', await page.getByRole('textbox', { name: 'Formula name' }).inputValue() === 'Friday night pies')
  await page.getByRole('textbox', { name: 'Formula name' }).fill('Friday pies')
  await page.getByRole('textbox', { name: 'Hydration' }).focus() // leaving the field saves too
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor({ state: 'attached' })
  await page.waitForTimeout(1200)
  await page.goto(`${formulaUrl}/bake`, { waitUntil: 'networkidle' })
  await page.locator('#recipe-card').waitFor()
  let bake = await page.locator('#recipe-card').textContent()
  check('bake sheet applies the formula', bake.includes('861g Kirkland Organic All-Purpose Flour') && bake.includes('542g water') && bake.includes('17.2g oil'), bake.slice(0, 600))
  check('bake sheet mixing includes the oil', bake.includes('Add the water, flour, oil, fine sea salt, and SAF red instant yeast to the spiral mixer'))
  check('bake sheet shows the method equipment', bake.includes('baking steel'))
  check('bake sheet is titled by the formula', await page.getByRole('heading', { level: 1, name: 'Friday pies' }).isVisible() && await page.getByRole('link', { name: 'Pin Recipe' }).count() === 0)
  check('the bake sheet has one Edit circle and no rename', await page.getByRole('link', { name: 'Edit formula' }).count() === 1 && await page.getByRole('textbox', { name: 'Formula name' }).count() === 0 && await page.locator('[data-recipe-action="Edit formula"]').evaluate((el) => el.closest('[role="group"]')?.getAttribute('aria-label') === 'Page actions'))
  await page.getByRole('button', { name: 'More pizzas' }).click()
  bake = await page.locator('#recipe-card').textContent()
  check('today\'s batch scales the bake sheet only', bake.includes('Making 4 pizzas today') && bake.includes('The usual batch for Friday pies is 3.') && page.url().endsWith('/bake?count=4'), bake.slice(0, 300))
  await page.goto(formulaUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor({ state: 'attached' })
  check('the editor has no batch count', await page.getByRole('textbox', { name: 'Pizzas' }).count() === 0)

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
  // Wait for the undone values rather than a fixed delay: the restore round-trip is slower under parallel load.
  await page.getByRole('textbox', { name: 'Oil' }).evaluate((input) => new Promise((resolve) => { const done = () => input.value === '2' && resolve(); done(); new MutationObserver(done).observe(input, { attributes: true }); setInterval(done, 50); setTimeout(resolve, 10000) }))
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
  await page.getByRole('heading', { level: 1, name: 'Friday pies, wetter' }).waitFor({ state: 'attached' })
  check('the copy opens as its own formula', await page.getByRole('textbox', { name: 'Hydration' }).inputValue() === '63')

  // Delete moves to Recently deleted with Undo.
  const wetterUrl = page.url()
  await page.getByRole('button', { name: 'Delete formula' }).click()
  await page.waitForURL('**/notebook?deleted=*')
  await page.getByRole('status').filter({ hasText: 'Deleted Friday pies, wetter' }).waitFor()
  check('deleting returns to the library with Undo', await page.locator('[data-kitchen-formula]').count() === 1)
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('status').filter({ hasText: 'Restored Friday pies, wetter' }).waitFor()
  check('undo restores the deleted formula', await page.locator('[data-kitchen-formula]').count() === 2)
  check('library groups formulas by dough', await page.getByRole('heading', { level: 2, name: /^Pizza/ }).isVisible())
  check('library cards open bake sheets', (await page.locator('[data-kitchen-formula]').first().getAttribute('href')).endsWith('/bake'))

  // Recently deleted rows: fixed height, Restore and Delete; Delete confirms inline and is permanent.
  await page.goto(wetterUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Delete formula' }).click()
  await page.waitForURL('**/notebook?deleted=*')
  await page.getByRole('button', { name: /^Recently deleted/ }).click()
  const row = page.locator('[data-deleted-formula]').filter({ hasText: 'Friday pies, wetter' })
  await row.waitFor()
  check('deleted rows are 104px tall', Math.round((await row.boundingBox()).height) === 104)
  check('deleted rows offer Restore and Delete', await row.getByRole('button', { name: 'Restore' }).isVisible() && await row.getByRole('button', { name: 'Delete' }).isVisible())
  await row.getByRole('button', { name: 'Delete' }).click()
  check('Delete asks inline first', (await row.textContent()).includes('Delete Friday pies, wetter?') && (await row.textContent()).includes('This can’t be undone.') && Math.round((await row.boundingBox()).height) === 104)
  await row.getByRole('button', { name: 'Cancel' }).click()
  check('Cancel keeps the formula', (await row.textContent()).includes('Restore'))
  await row.getByRole('button', { name: 'Delete' }).click()
  await row.getByRole('button', { name: 'Delete' }).click()
  await page.locator('[data-deleted-formula]').filter({ hasText: 'Friday pies, wetter' }).waitFor({ state: 'detached' })
  check('confirmed Delete removes it for good', await page.locator('[data-deleted-formula]').filter({ hasText: 'Friday pies, wetter' }).count() === 0)

  await page.goto(`${BASE}/recipes/new-york-style-pizza`, { waitUntil: 'networkidle' })
  await page.locator('[data-recipe-kitchen] a[href^="/notebook/new-york-style-pizza/"]').first().waitFor()
  check('the recipe links to the member\'s versions', (await page.locator('[data-recipe-kitchen]').textContent()).includes('Friday pies'))
  await member.close()

  // Phones: no sideways scroll, and the dough total stays docked.
  // 320×568 is a small phone where the full sheet's list must scroll.
  for (const [width, height] of [[390, 800], [320, 568]]) {
    const phone = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await signIn(phone, BASE)
    page = await open(phone, new URL(formulaUrl).pathname)
    await page.getByRole('heading', { level: 1, name: 'Friday pies' }).waitFor({ state: 'attached' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`formula page fits ${width}px`, overflow <= 0, `${overflow}px overflow`)
    const dock = page.locator('[data-dough-dock]')
    check(`dough total is docked at ${width}px`, await dock.isVisible() && (await dock.textContent()).includes('1,440g'))
    await dock.getByRole('button', { name: /Your dough/ }).click()
    check(`docked dough expands at ${width}px`, await dock.locator('[data-dough-results]').isVisible() && await dock.getAttribute('data-stop') === 'half')
    // Real touch swipes: the one sheet follows the finger both ways; nothing else animates.
    await page.waitForTimeout(400) // let the opening slide finish before measuring the handle
    const stopAfter = async (from, to, options) => { await swipe(page, width / 2, from, to, options); await page.waitForTimeout(400); return dock.getAttribute('data-stop') }
    const handleY = async () => { const box = await dock.boundingBox(); return box.y + 12 }
    check(`swiping down closes the dough sheet at ${width}px`, await stopAfter(await handleY(), height - 10) === 'peek')
    check(`swiping up opens the dough sheet at ${width}px`, await stopAfter(await handleY(), height * 0.4) !== 'peek')
    check(`a slow drag to the top settles full at ${width}px`, await stopAfter(await handleY(), 40, { hold: true }) === 'full')
    check(`swiping down from full steps back at ${width}px`, await stopAfter(await handleY(), height - 10) === 'peek')
    // A drag that starts on the summary button must not also toggle the sheet on release.
    const summary = await dock.getByRole('button', { name: /Your dough/ }).boundingBox()
    check(`a drag from the summary settles where it is dropped at ${width}px`, await stopAfter(summary.y + summary.height / 2, height * 0.4, { hold: true }) === 'half')
    await page.mouse.click(width / 2, 40)
    await page.waitForTimeout(400)
    check(`tapping the dimmed page closes the sheet at ${width}px`, await dock.getAttribute('data-stop') === 'peek')
    check(`the page is tappable while the sheet rests at ${width}px`, await page.evaluate(() => !document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('[aria-hidden="true"].fixed')))
    const reserved = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom))
    const resting = await page.evaluate(() => innerHeight - document.querySelector('[data-dough-dock]').getBoundingClientRect().top)
    check(`the page reserves exactly the resting sheet at ${width}px`, Math.abs(reserved - resting) <= 1, `${reserved} vs ${resting}`)
    await dock.getByRole('button', { name: /Your dough/ }).click()
    await page.waitForTimeout(400)
    await dock.locator('[data-dough-results]').locator('xpath=..').evaluate((panel) => { panel.tabIndex = -1; panel.focus() })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    check(`Escape closes the sheet and keeps focus on it at ${width}px`, await dock.getAttribute('data-stop') === 'peek' && await page.evaluate(() => document.activeElement?.getAttribute('aria-expanded') === 'false'))
    // At full height the list scrolls by touch instead of moving the sheet.
    await stopAfter(await handleY(), 40, { hold: true })
    const panel = dock.locator('[data-dough-results]').locator('xpath=..')
    if (height < 800) {
      await swipe(page, width / 2, height * 0.8, height * 0.4)
      await page.waitForTimeout(400)
      check(`the full sheet's list scrolls by touch at ${width}px`, await dock.getAttribute('data-stop') === 'full' && await panel.evaluate((el) => el.scrollTop > 0))
      await stopAfter(await handleY(), height - 10)
      await dock.getByRole('button', { name: /Your dough/ }).click()
      await page.waitForTimeout(400)
      check(`the list starts at the top after collapsing at ${width}px`, await panel.evaluate((el) => el.scrollTop === 0))
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    } else await stopAfter(await handleY(), height - 10)
    check(`the dough sheet is one element, not a modal at ${width}px`, await page.locator('[data-dough-dock]').count() === 1 && await page.locator('[role="dialog"]').count() === 0)
    page = await open(phone, '/notebook/sourdough-bread')
    check(`sourdough calculator fits ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    await phone.close()
  }
} finally {
  await browser.close()
  await server.close()
}

async function swipe(page, x, fromY, toY, { steps = 8, hold = false } = {}) {
  const cdp = await page.context().newCDPSession(page)
  const point = (y) => [{ x, y, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(fromY) })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(fromY + ((toY - fromY) * i) / steps) })
    await page.waitForTimeout(16)
  }
  if (hold) {
    // Rest the finger before lifting: no flick, so the nearest height wins.
    await page.waitForTimeout(150)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(toY) })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

for (const result of results) console.log(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.name}${result.detail ? ' :: ' + result.detail : ''}`)
if (errors.length) {
  console.log('\nPage errors:')
  for (const error of errors) console.log('  ' + error)
}
const failed = results.filter((result) => !result.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed || errors.length ? 1 : 0)
