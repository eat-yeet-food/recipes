/**
 * Cold-loads the deployed site in a real browser and fails on anything a
 * visitor would see as broken.
 *
 * curl is not enough here, and that is the whole point of this file. When the
 * edge cached an HTML body under a JS chunk's URL, `curl` fetched the same
 * chunk and got correct JavaScript — a different cache key, a clean 200, a
 * green check. Chrome asked for it as a module, got `text/html`, refused it,
 * and the site did not hydrate. Only a browser sees that class of failure, so
 * the post-deploy gate has to be a browser.
 *
 * Usage: node test/verify-prod.mjs [origin]
 */
import { chromium } from 'playwright'

import { SITE_URL, STATIC_PATHS } from '../site.config.mjs'

const ORIGIN = (process.argv[2] ?? SITE_URL).replace(/\/$/, '')

let failures = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`)
  if (!ok) failures += 1
}

const browser = await chromium.launch()

for (const path of STATIC_PATHS) {
  // A fresh context per path: a warm cache would hide exactly the failures
  // this file exists to catch.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const problems = []

  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) =>
    problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`),
  )
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`http ${response.status()}: ${response.url()}`)
    // The poisoned-cache signature: an asset answered with a document.
    const type = response.headers()['content-type'] ?? ''
    if (/\/build\/.+\.(js|css)$/.test(response.url()) && type.includes('text/html')) {
      problems.push(`asset served as HTML: ${response.url()}`)
    }
  })

  const response = await page.goto(ORIGIN + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  check(`${path} responds 200`, response?.status() === 200, String(response?.status()))
  check(`${path} loads clean`, problems.length === 0, problems.join(' | '))

  const hasContent = await page.evaluate(
    () => (document.querySelector('#main-content')?.childElementCount ?? 0) > 0,
  )
  check(`${path} rendered main content`, hasContent)

  const brokenImages = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  )
  check(`${path} has no broken images`, brokenImages.length === 0, brokenImages.join(', '))

  await context.close()
}

// Hydration is what the poisoned cache actually destroyed, and neither a
// screenshot nor a status code can tell: the server HTML renders perfectly
// while nothing is interactive. Clicking a client-side link is the difference —
// if the router never mounted, the browser does a full document load instead.
const nav = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const navPage = await nav.newPage()
await navPage.goto(`${ORIGIN}/browse`, { waitUntil: 'networkidle' })
let fullLoads = 0
navPage.on('load', () => (fullLoads += 1))
await navPage.locator('a[href^="/search?"]').first().click()
await navPage.waitForTimeout(1200)
check(
  'client-side routing works (app hydrated)',
  navPage.url().includes('/search') && fullLoads === 0,
  `${navPage.url()}, ${fullLoads} full load(s)`,
)
await nav.close()

// A missing asset must come back as a 404, never as HTML under a 200 — that is
// the condition that let the edge pin a document under an asset URL. CLAUDE.md #6.
const probe = await fetch(`${ORIGIN}/build/does-not-exist-${Date.now()}.js`)
check(
  'missing /build/* asset returns 404',
  probe.status === 404,
  `HTTP ${probe.status}, content-type ${probe.headers.get('content-type')}`,
)

await browser.close()

console.log(failures === 0 ? `\nprod verified: ${ORIGIN}` : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
