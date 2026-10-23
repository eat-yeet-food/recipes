/**
 * Axe accessibility audit against representative prerendered pages.
 *
 * Fails on every WCAG impact level. Saves incomplete findings for manual review.
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { signIn } from '#web-test/member-session'
import { chromium } from 'playwright'

import { RESOLVED_APP_PATHS } from '#web-test/app-paths'
import { startApp as startStatic } from '#web-test/static-server'

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
  '/account/sign-in',
  '/account/settings',
  '/kitchen',
  '/kitchen/new-york-style-pizza',
  '/kitchen/sourdough-bread',
  '/kitchen/new-york-style-pizza/bake',
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
    if (INDEX.some(recipe => recipe.slug === 'new-york-style-pizza')) {
      // Saved formulas are a member feature; the rest of this pass stays anonymous.
      await signIn(context, server.url.replace(/\/$/, ''))
      await page.goto(new URL('/kitchen/new-york-style-pizza', server.url).href, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /^Rename / }).click()
      await page.getByRole('textbox', { name: 'Formula name' }).fill(`Accessibility ${width}`)
      await audit(page, 'Test Kitchen / renaming', width)
      await page.keyboard.press('Enter')
      await page.getByRole('textbox', { name: 'Formula name' }).waitFor({ state: 'detached' })
      await page.getByRole('heading', { level: 1, name: `Accessibility ${width}` }).waitFor()
      await page.getByRole('button', { name: 'Save to Test Kitchen' }).first().click()
      await page.waitForURL(/\/kitchen\/new-york-style-pizza\/[A-Za-z0-9_-]{16}\/bake(\?saved=1)?$/)
      await page.locator('#recipe-card').waitFor()
      await audit(page, 'Test Kitchen / bake sheet', width)
      await page.getByRole('link', { name: 'Edit formula' }).click()
      await page.waitForURL(/\/kitchen\/new-york-style-pizza\/[A-Za-z0-9_-]{16}$/)
      await page.getByRole('heading', { level: 1, name: `Accessibility ${width}` }).waitFor()
      await audit(page, 'Test Kitchen / formula', width)
      await page.getByRole('button', { name: 'History' }).first().click()
      await page.locator('[data-kitchen-history]').waitFor()
      await audit(page, 'Test Kitchen / history', width)
      await page.keyboard.press('Escape')
      await page.goto(new URL('/kitchen', server.url).href, { waitUntil: 'networkidle' })
      await page.locator('[data-kitchen-formula]').first().waitFor()
      await audit(page, 'Test Kitchen / library (member)', width)
      await context.clearCookies()
      await page.evaluate(() => localStorage.clear())
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
