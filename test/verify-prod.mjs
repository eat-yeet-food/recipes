/** Verify the deployed Worker contract with cold browsers and raw HTTP. */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { SITE_URL, STATIC_PATHS } from '#site-config'
const origin = (process.argv[2] ?? SITE_URL).replace(/\/$/, '')
const expected = process.env.EATYEET_EXPECTED_RELEASE
const mediaOrigin = process.env.EATYEET_MEDIA_ORIGIN ?? (origin === 'https://eatyeet.com' ? 'https://media.eatyeet.com' : origin)
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`) }
const headersFor = (url) => {
  const headers = {}
  if ([origin, mediaOrigin].includes(new URL(url).origin) && process.env.EATYEET_VERIFY_TOKEN) headers['X-Eatyeet-Verification'] = process.env.EATYEET_VERIFY_TOKEN
  if (new URL(url).origin === origin) {
    if (process.env.EATYEET_ACCESS_TOKEN) headers.Cookie = `CF_Authorization=${process.env.EATYEET_ACCESS_TOKEN}`
  }
  return headers
}
const get = (path, options = {}) => fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000), ...options, headers: { ...headersFor(origin + path), ...options.headers } })
const browser = await chromium.launch()
try {
  if (expected) {
    const response = await get('/.well-known/eatyeet-release')
    const state = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
    check('release identity', response.status === 200 && state?.releaseId === expected)
    check('synchronized content identity', /^[a-f0-9]{40}$/.test(state?.contentRevision ?? ''))
  }
  for (const path of [...new Set([...STATIC_PATHS, '/recipes/new-york-style-pizza', '/learn/mixing-dough-and-gluten-development'])]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.route('**/*', async (route) => route.continue({ headers: { ...route.request().headers(), ...headersFor(route.request().url()) } }))
    const page = await context.newPage(), errors = []
    page.on('pageerror', () => errors.push('uncaught page error'))
    page.on('requestfailed', (request) => { if (new URL(request.url()).origin === origin) errors.push('failed first-party request') })
    page.on('response', (response) => {
      const url = new URL(response.url())
      if (url.origin === origin && response.status() >= 400) errors.push(`HTTP ${response.status()} ${url.pathname}`)
      if (url.pathname.startsWith('/_next/static/') && /text\/html/.test(response.headers()['content-type'] ?? '')) errors.push('static asset returned HTML')
    })
    const response = await page.goto(origin + path, { waitUntil: 'networkidle' })
    check(`${path} HTTP 200`, response?.status() === 200)
    check(`${path} dynamic HTML not cached`, /no-store/.test(response?.headers()['cache-control'] ?? ''))
    if (expected) check(`${path} expected Worker`, response?.headers()['x-eatyeet-release'] === expected)
    check(`${path} main content`, await page.locator('#main-content').count() === 1)
    check(`${path} browser errors`, errors.length === 0, errors.join(', '))
    check(`${path} images loaded`, await page.evaluate(() => [...document.images].filter((image) => image.getBoundingClientRect().top < innerHeight).every((image) => image.complete && image.naturalWidth > 0)))
    check(`${path} canonical`, await page.locator('link[rel=canonical]').getAttribute('href') === origin + path || (origin.includes('staging.') && (await page.locator('link[rel=canonical]').getAttribute('href'))?.startsWith('https://staging.eatyeet.com')))
    if (path === '/browse') {
      let documentLoads = 0
      page.on('load', () => documentLoads++)
      await page.locator('a[href^="/search?"]').first().click()
      await page.waitForURL('**/search?**')
      check('hydrated client navigation', documentLoads === 0)
    }
    const raw = await get(path)
    const html = await raw.text()
    check(`${path} server metadata`, /<title>[^<]+<\/title>/.test(html) && /property="og:title"/.test(html))
    if (path.startsWith('/recipes/')) check('Recipe JSON-LD', html.includes('application/ld+json') && html.includes('"@type":"Recipe"'))
    if (path === '/recipes/new-york-style-pizza') {
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await page.reload({ waitUntil: 'networkidle' })
        const sources = await page.locator('picture img').evaluateAll((images) => images.filter((image) => image.getBoundingClientRect().top < innerHeight).map((image) => image.currentSrc))
        check(`responsive derivatives at ${width}px`, sources.length > 0 && sources.every((url) => new URL(url).origin === mediaOrigin && new URL(url).pathname.startsWith('/media/')))
        for (const url of sources.slice(0, 2)) {
          const image = await fetch(url, { headers: headersFor(url), redirect: 'manual' })
          check(`image delivery at ${width}px`, image.ok && /^image\//.test(image.headers.get('content-type') ?? '') && !!image.headers.get('etag') && Number(image.headers.get('content-length')) > 0)
          if (origin === 'https://eatyeet.com') check('public derivative browser cache', /max-age=31536000/.test(image.headers.get('cache-control') ?? '') && !/immutable/.test(image.headers.get('cache-control') ?? ''))
          await image.body?.cancel()
        }
      }
    }
    await context.close()
  }
  for (const path of [`/_next/static/missing-${Date.now()}.js`, '/media/' + '0'.repeat(64) + '/320.avif']) {
    const response = await get(path)
    check(`${path} missing response`, response.status === 404)
    check(`${path} error not cached`, /no-store/.test(response.headers.get('cache-control') ?? ''))
    if (path.startsWith('/media/')) check('media error has no HTML body', !(await response.text()).includes('<html'))
  }
  for (const path of ['/admin', '/api/owners', '/api/recipes', '/preview/recipes/new-york-style-pizza']) {
    const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
    check(`${path} denies anonymous access`, [302,303,401,403].includes(response.status))
    const forged = await fetch(origin + path, { redirect: 'manual', headers: { 'Cf-Access-Jwt-Assertion': 'forged', Cookie: 'CF_Authorization=forged' } })
    check(`${path} rejects forged Access token`, [302,303,401,403].includes(forged.status))
  }
  const sitemap = await get('/sitemap.xml')
  check('sitemap XML', sitemap.status === 200 && /xml/.test(sitemap.headers.get('content-type') ?? ''))
} finally {
  await browser.close()
  mkdirSync('dist', { recursive: true })
  writeFileSync('dist/worker-production-verification.json', JSON.stringify({ origin, releaseId: expected ?? null, checkedAt: new Date().toISOString(), results, passed: results.every((r) => r.ok) }, null, 2))
}
if (results.some((r) => !r.ok)) process.exitCode = 1
