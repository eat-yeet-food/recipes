/**
 * Screenshots the prerendered site over HTTP for visual regression checks.
 *
 * Usage: node test/shots.mjs [outDir]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { startStatic } from './static-server.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? join(ROOT, 'dist', 'shots')

/**
 * Named to match the visual baseline. `category` is absent by design because
 * browse facets resolve to search URLs rather than standalone category pages.
 */
export const SHOTS = [
  { name: 'home', path: '/', full: true },
  { name: 'home-fold', path: '/', full: false },
  { name: 'recipe', path: '/recipes/new-york-style-pizza', full: true },
  { name: 'search', path: '/search', full: false },
  { name: 'home-mobile', path: '/', full: false, viewport: { width: 390, height: 844 } },
  { name: 'browse', path: '/browse', full: true },
  { name: 'recipes-index', path: '/recipes', full: true },
  { name: 'recipe-mobile', path: '/recipes/new-york-style-pizza', full: false, viewport: { width: 390, height: 844 } },
]

export async function capture(outDir) {
  mkdirSync(outDir, { recursive: true })
  const server = await startStatic(join(ROOT, '.output', 'public'))
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

    await page.goto(server.url.replace(/\/$/, '') + shot.path, { waitUntil: 'networkidle' })
    // Hydration settles layout; fonts and lazy images need a beat to land.
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(outDir, `${shot.name}.png`), fullPage: shot.full })
    await page.close()
  }

  await browser.close()
  await server.close()
  return errors
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await capture(OUT)
  for (const shot of SHOTS) console.log(`  ${shot.name}.png`)
  if (errors.length) {
    console.log('\nPage errors:')
    for (const e of errors) console.log('  ' + e)
    process.exit(1)
  }
  console.log('\nNo page errors.')
}
