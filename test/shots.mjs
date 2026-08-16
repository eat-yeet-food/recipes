/**
 * Screenshots the built site so the rendering can be eyeballed and compared
 * against the original design. `--web` shoots dist/ over HTTP instead of the
 * single file over file://, which is how the two targets get compared.
 *
 * Usage: node test/shots.mjs [outDir] [--web]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { startStatic } from './static-server.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const web = process.argv.includes('--web')
const server = web ? await startStatic(join(ROOT, 'dist')) : null
const FILE = server ? server.url : `file://${join(ROOT, 'dist', 'recipes.html')}`
const OUT =
  process.argv.slice(2).find((a) => !a.startsWith('--')) ??
  join(ROOT, 'dist', 'shots', web ? 'web' : 'file')

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
await server?.close()

if (errors.length) {
  console.log('\nPage errors:')
  for (const e of errors) console.log('  ' + e)
  process.exit(1)
}
console.log('\nNo page errors.')
