import { mkdirSync, writeFileSync } from 'node:fs'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from 'playwright'
import { startApp } from './app-server.mjs'
import { startStatic } from './static-server.mjs'
const baseline = process.argv.includes('--baseline')
const server = baseline
  ? await startStatic('/tmp/eatyeet-before-public')
  : await startApp()
const origin = (
  server?.url ??
  process.env.TEST_ORIGIN ??
  'http://127.0.0.1:3000'
).replace(/\/$/, '')
const paths = [
  '/',
  '/recipes',
  '/browse',
  '/learn',
  '/recipes/new-york-style-pizza',
  '/learn/mixing-dough-and-gluten-development',
]
const results = []
try {
  for (const path of paths) {
    const runs = []
    for (let i = 0; i < 3; i++) {
      const chrome = await launch({
        chromePath: chromium.executablePath(),
        chromeFlags: ['--headless=new', '--no-sandbox'],
      })
      try {
        const { lhr } = await lighthouse(origin + path, {
          port: chrome.port,
          logLevel: 'error',
          output: 'json',
          onlyCategories: ['performance', 'accessibility', 'seo'],
        })
        if (lhr.runtimeError) throw new Error(JSON.stringify(lhr.runtimeError))
        runs.push({
          performance: lhr.categories.performance.score,
          accessibility: lhr.categories.accessibility.score,
          seo: lhr.categories.seo.score,
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
        })
      } finally {
        await chrome.kill()
      }
    }
    const median = Object.fromEntries(
      Object.keys(runs[0]).map((k) => [
        k,
        runs.map((r) => r[k]).sort((a, b) => a - b)[1],
      ]),
    )
    results.push({ path, runs, median })
    console.log(path, median)
  }
} finally {
  await server?.close()
}
mkdirSync('dist', { recursive: true })
writeFileSync(
  `dist/performance-${baseline ? 'before' : 'after'}.json`,
  JSON.stringify({ origin, results }, null, 2),
)
if (
  !baseline &&
  results.some(
    ({ median: m }) =>
      m.performance < 0.9 ||
      m.lcp > 2500 ||
      m.cls > 0.1 ||
      m.accessibility < 0.95 ||
      m.seo < 1,
  )
)
  process.exitCode = 1
