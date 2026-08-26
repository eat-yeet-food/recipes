/**
 * Lighthouse quality target for crawlable pages.
 *
 * The SEO category should remain perfect on the static pages. Accessibility is
 * held at 95+ here, with axe covering concrete WCAG violations separately.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { chromium } from 'playwright'

import { RESOLVED_APP_PATHS } from '#web-test/app-paths'
import { startStatic } from '#web-test/static-server'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..')
const OUT = join(ROOT, '.output', 'public')
const INDEX = JSON.parse(readFileSync(join(RESOLVED_APP_PATHS.generatedDir, 'index.json'), 'utf8'))
const ARTICLE_INDEX_FILE = join(RESOLVED_APP_PATHS.generatedDir, 'articles', 'index.json')
const ARTICLE_INDEX = existsSync(ARTICLE_INDEX_FILE) ? JSON.parse(readFileSync(ARTICLE_INDEX_FILE, 'utf8')) : []
const MIN = {
  accessibility: Number(process.env.LH_ACCESSIBILITY_MIN ?? 0.95),
  seo: Number(process.env.LH_SEO_MIN ?? 1),
}
const ROUTE_TIMEOUT_MS = Number(process.env.LH_ROUTE_TIMEOUT_MS ?? 45_000)

const paths = [
  '/',
  '/recipes',
  '/browse',
  '/learn',
  `/recipes/${INDEX[0].slug}`,
  ...(ARTICLE_INDEX[0] ? [`/learn/${ARTICLE_INDEX[0].slug}`] : []),
]
const server = await startStatic(OUT)
const failures = []

async function withTimeout(promise, label) {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out`)), ROUTE_TIMEOUT_MS)
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

try {
  for (const path of paths) {
    const chrome = await launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless=new', '--no-sandbox'],
    })

    try {
      const result = await withTimeout(
        lighthouse(new URL(path, server.url).href, {
          port: chrome.port,
          logLevel: 'error',
          output: 'json',
          onlyCategories: ['accessibility', 'seo'],
        }),
        path,
      )

      for (const [category, minimum] of Object.entries(MIN)) {
        const score = result.lhr.categories[category]?.score ?? 0
        const ok = score >= minimum
        if (!ok) failures.push(`${path} ${category} score ${score} < ${minimum}`)
        console.log(`${ok ? 'ok  ' : 'FAIL'}  ${path} ${category} ${(score * 100).toFixed(0)} >= ${minimum * 100}`)
      }
    } catch (error) {
      failures.push(`${path} ${error instanceof Error ? error.message : String(error)}`)
      console.log(`FAIL  ${path} ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      await chrome.kill()
    }
  }
} finally {
  await server.close()
}

process.exit(failures.length ? 1 : 0)
