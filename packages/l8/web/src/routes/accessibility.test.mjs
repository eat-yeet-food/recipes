/**
 * Axe accessibility audit against representative prerendered pages.
 *
 * Fails on serious and critical WCAG violations by default. Set
 * A11Y_IMPACTS=minor,moderate,serious,critical to ratchet the target tighter.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

import { startStatic } from '#web-test/static-server'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..')
const OUT = join(ROOT, '.output', 'public')
const APP_ID = process.env.APP_ID || 'eatyeet'
const INDEX = JSON.parse(readFileSync(join(ROOT, 'apps', APP_ID, 'generated', 'index.json'), 'utf8'))
const IMPACTS = (process.env.A11Y_IMPACTS ?? 'serious,critical')
  .split(',')
  .map((impact) => impact.trim())
  .filter(Boolean)

const paths = ['/', '/recipes', '/browse', '/search', `/recipes/${INDEX[0].slug}`]

const server = await startStatic(OUT)
const browser = await chromium.launch()
const failures = []

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await context.newPage()

  for (const path of paths) {
    await page.goto(new URL(path, server.url).href, { waitUntil: 'networkidle' })
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const violations = result.violations.filter((violation) =>
      IMPACTS.includes(violation.impact ?? ''),
    )

    if (violations.length === 0) {
      console.log(`ok    ${path}`)
      continue
    }

    for (const violation of violations) {
      const nodes = violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join('; ')
      failures.push(`${path} ${violation.id} [${violation.impact}] ${nodes}`)
      console.log(`FAIL  ${path} ${violation.id} [${violation.impact}] ${nodes}`)
    }
  }
} finally {
  await browser.close()
  await server.close()
}

console.log(`\naxe target: ${IMPACTS.join(', ')}`)
process.exit(failures.length ? 1 : 0)
