import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
const origin = process.argv[2]
if (!['https://eatyeet.com', 'https://staging.eatyeet.com'].includes(origin)) throw new Error('Explicit trusted remote origin required')
const results = []
for (const path of ['/', '/recipes', '/browse', '/learn', '/recipes/new-york-style-pizza', '/learn/mixing-dough-and-gluten-development']) {
  const runs = []
  for (let i = 0; i < 3; i++) {
    const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] })
    try {
      // Install the Access cookie only for this origin; never put it in global headers.
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`)
      if (process.env.EATYEET_ACCESS_TOKEN) await browser.contexts()[0].addCookies([{ name: 'CF_Authorization', value: process.env.EATYEET_ACCESS_TOKEN, url: origin, secure: true, httpOnly: true }])
      const { lhr } = await lighthouse(origin+path, { port: chrome.port, logLevel: 'error', onlyCategories: ['performance','accessibility','seo'], disableStorageReset: true })
      if (lhr.runtimeError) throw new Error(lhr.runtimeError.code)
      runs.push({ performance: lhr.categories.performance.score, lcp: lhr.audits['largest-contentful-paint'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue })
    } finally { await chrome.kill() }
  }
  const median = Object.fromEntries(Object.keys(runs[0]).map((key) => [key, runs.map((r) => r[key]).sort((a,b)=>a-b)[1]]))
  results.push({ path, runs, median })
  console.log(path, median)
}
mkdirSync('dist',{recursive:true})
writeFileSync('dist/remote-performance.json',JSON.stringify({origin,results},null,2))
if(results.some(({median:m})=>m.performance<0.9||m.lcp>2500||m.cls>0.1)) process.exitCode=1
