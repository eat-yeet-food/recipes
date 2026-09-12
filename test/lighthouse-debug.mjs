import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { startApp } from './app-server.mjs'
const server = await startApp(),
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox'],
  })
try {
  const { lhr } = await lighthouse(
    new URL(process.argv[2] || '/recipes/new-york-style-pizza', server.url)
      .href,
    {
      port: chrome.port,
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'seo', 'accessibility'],
    },
  )
  writeFileSync('dist/lighthouse-debug.json', JSON.stringify(lhr, null, 2))
  console.log({
    performance: lhr.categories.performance.score,
    lcp: lhr.audits['largest-contentful-paint'].numericValue,
    cls: lhr.audits['cumulative-layout-shift'].numericValue,
  })
  for (const key of [
    'cls-culprits-insight',
    'lcp-breakdown-insight',
    'lcp-discovery-insight',
  ])
    console.log(key, JSON.stringify(lhr.audits[key]?.details))
} finally {
  await chrome.kill()
  await server.close()
}
