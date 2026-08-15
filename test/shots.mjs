/**
 * Screenshots the built file over file:// so the rendering can be eyeballed
 * and compared against the original design.
 *
 * Usage: node test/shots.mjs [outDir]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = `file://${join(ROOT, 'dist', 'recipes.html')}`
const OUT = process.argv[2] ?? join(ROOT, 'dist', 'shots')

const SHOTS = [
  { name: 'home', hash: '#/', full: true },
  { name: 'home-fold', hash: '#/', full: false },
  { name: 'recipe', hash: '#/r/charred-crust-pizza', full: true },
  { name: 'search', hash: '#/search', full: false },
  { name: 'category', hash: '#/c/baking', full: false },
  { name: 'home-mobile', hash: '#/', full: false, viewport: { width: 390, height: 844 } },
]

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const errors = []

for (const shot of SHOTS) {
  const page = await browser.newPage({
    viewport: shot.viewport ?? { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  page.on('pageerror', (e) => errors.push(`${shot.name}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${shot.name} console: ${m.text()}`)
  })

  await page.goto(FILE + shot.hash, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(OUT, `${shot.name}.png`), fullPage: shot.full })
  console.log(`  ${shot.name}.png`)
  await page.close()
}

await browser.close()

if (errors.length) {
  console.log('\nPage errors:')
  for (const e of errors) console.log('  ' + e)
  process.exit(1)
}
console.log('\nNo page errors.')
