import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
const origin = process.argv[2]
if (!['https://eatyeet.com', 'https://staging.eatyeet.com'].includes(origin)) throw new Error('Explicit trusted remote origin required')
const results = []
const diagnostics = process.argv.includes('--diagnostics')
async function releaseState() {
  const response = await fetch(origin + '/.well-known/eatyeet-release', {
    redirect: 'manual', signal: AbortSignal.timeout(30000),
    headers: process.env.EATYEET_ACCESS_TOKEN ? { Cookie: `CF_Authorization=${process.env.EATYEET_ACCESS_TOKEN}` } : {},
  })
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Authenticated application release state is unavailable')
  const state = await response.json()
  if (state.status !== 'ready' || !state.releaseId || !state.generation) throw new Error('Performance measurement requires a ready release')
  return state
}
const before = await releaseState()
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
      if (lhr.finalDisplayedUrl !== origin + path || !lhr.audits['network-requests'].details.items.some((request) => request.resourceType === 'Document' && request.url === origin + path && request.statusCode === 200))
        throw new Error('Performance navigation did not return the requested application page')
      if (diagnostics) {
        mkdirSync('dist/remote-performance-diagnostics', { recursive: true })
        writeFileSync(`dist/remote-performance-diagnostics/${path.replaceAll('/', '_')}-${i + 1}.json`, JSON.stringify(lhr))
      }
      runs.push({ performance: lhr.categories.performance.score, lcp: lhr.audits['largest-contentful-paint'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue })
    } finally { await chrome.kill() }
  }
  const median = Object.fromEntries(Object.keys(runs[0]).map((key) => [key, runs.map((r) => r[key]).sort((a,b)=>a-b)[1]]))
  results.push({ path, runs, median })
  console.log(path, median)
}
mkdirSync('dist',{recursive:true})
if (JSON.stringify(await releaseState()) !== JSON.stringify(before)) throw new Error('Release changed during performance measurement')
writeFileSync('dist/remote-performance.json',JSON.stringify({origin,release:before,checkedAt:new Date().toISOString(),results},null,2))
if(results.some(({median:m})=>m.performance<0.9||m.lcp>2500||m.cls>0.1)) process.exitCode=1
