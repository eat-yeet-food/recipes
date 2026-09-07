/**
 * Axe accessibility audit against representative prerendered pages.
 *
 * Fails on every WCAG impact level. Saves incomplete findings for manual review.
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

import { RESOLVED_APP_PATHS } from '#web-test/app-paths'
import { startStatic } from '#web-test/static-server'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..')
const OUT = join(ROOT, '.output', 'public')
const INDEX = JSON.parse(readFileSync(join(RESOLVED_APP_PATHS.generatedDir, 'index.json'), 'utf8'))
const ARTICLE_INDEX_FILE = join(RESOLVED_APP_PATHS.generatedDir, 'articles', 'index.json')
const ARTICLE_INDEX = existsSync(ARTICLE_INDEX_FILE) ? JSON.parse(readFileSync(ARTICLE_INDEX_FILE, 'utf8')) : []
const IMPACTS = (process.env.A11Y_IMPACTS ?? 'minor,moderate,serious,critical')
  .split(',')
  .map((impact) => impact.trim())
  .filter(Boolean)

const paths = [
  '/',
  '/recipes',
  '/browse',
  '/search',
  '/search?courses=mains',
  '/search?q=does-not-exist',
  '/learn',
  `/recipes/${INDEX[0].slug}`,
  ...(ARTICLE_INDEX[0] ? [`/learn/${ARTICLE_INDEX[0].slug}`] : []),
]

const server = await startStatic(OUT)
const browser = await chromium.launch()
const failures = []
const results = []

async function audit(page, label, width) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const violations = result.violations.filter(v => IMPACTS.includes(v.impact ?? ''))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
  const record = { label, width, overflow, violations, incomplete: result.incomplete }
  results.push(record)
  if (violations.length || overflow) failures.push(record)
  console.log(`${violations.length || overflow ? 'FAIL' : 'ok  '} ${width} ${label}${violations.length ? ' '+violations.map(v=>v.id).join(', ') : ''}${overflow ? ' horizontal overflow' : ''}`)
}

try {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of paths) {
      await page.goto(new URL(path, server.url).href, { waitUntil: 'networkidle' })
      await audit(page, path, width)
    }
    await page.goto(server.url, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Search recipes', exact: true }).click()
    await page.getByRole('combobox').fill('pizza')
    await audit(page, 'Search palette / results', width)
    await page.getByRole('combobox').fill('no matching recipe')
    await audit(page, 'Search palette / empty', width)
    await page.keyboard.press('Escape')
    if (INDEX.some(recipe => recipe.slug === 'sourdough-bread')) {
      await page.goto(new URL('/recipes/sourdough-bread', server.url).href, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Adjust recipe', exact: true }).first().click()
      await audit(page, 'Dough workbench / open', width)
      await page.locator('[aria-labelledby=preview-heading]').scrollIntoViewIfNeeded()
      await audit(page, 'Dough workbench / summary', width)
      await page.keyboard.press('Escape')
    }
  }
} finally {
  await browser.close()
  await server.close()
}
mkdirSync(join(ROOT, 'dist'), { recursive: true })
writeFileSync(join(ROOT, 'dist', 'app-a11y.json'), JSON.stringify({ results, failures }, null, 2))
console.log(`\n${results.length} page/state checks; ${failures.length} failures. All WCAG impact levels; details in dist/app-a11y.json`)
process.exitCode = failures.length ? 1 : 0
