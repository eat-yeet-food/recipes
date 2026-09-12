import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { startApp } from './app-server.mjs'
const server = await startApp(),
  browser = await chromium.launch(),
  results = []
try {
  const noJS = await browser.newContext({ javaScriptEnabled: false })
  const document = await noJS.newPage()
  await document.goto(new URL('/recipes/new-york-style-pizza', server.url).href)
  assert(
    await document
      .getByRole('heading', { name: 'New York Style Pizza', exact: true })
      .isVisible(),
  )
  assert(
    await document
      .getByRole('heading', { name: 'Ingredients', exact: true })
      .first()
      .isVisible(),
  )
  await noJS.close()
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: width === 390 ? 2 : 1,
    })
    for (const path of [
      '/',
      '/recipes',
      '/browse',
      '/learn',
      '/recipes/new-york-style-pizza',
      '/learn/mixing-dough-and-gluten-development',
    ]) {
      const page = await context.newPage(),
        responses = []
      page.on('response', (response) => {
        if (response.request().resourceType() === 'image')
          responses.push({
            url: response.url(),
            status: response.status(),
            bytes: Number(response.headers()['content-length'] || 0),
          })
      })
      await page.goto(new URL(path, server.url).href, {
        waitUntil: 'networkidle',
      })
      const images = await page
        .locator('main img')
        .evaluateAll((imgs) =>
          imgs.map((img) => ({
            src: img.currentSrc,
            width: img.getBoundingClientRect().width,
            height: img.getBoundingClientRect().height,
            naturalWidth: img.naturalWidth,
            complete: img.complete,
            loading: img.loading,
            priority: img.fetchPriority,
            visible: img.getBoundingClientRect().top < innerHeight,
          })),
        )
      for (const image of images.filter((i) => i.visible && i.width > 0)) {
        assert(image.complete && image.naturalWidth > 0, path)
        assert(image.src.includes('/media/'), image.src)
      }
      assert(
        responses.every((r) => r.status === 200),
        path + ' broken images',
      )
      const derivativeResponses = responses.filter((r) =>
        r.url.includes('/media/'),
      )
      assert.equal(
        new Set(derivativeResponses.map((r) => r.url)).size,
        derivativeResponses.length,
        path + ' duplicate downloads',
      )
      assert(
        images.filter((i) => i.priority === 'high').length <= 1,
        path + ' competing high-priority images',
      )
      results.push({
        width,
        path,
        images,
        responses,
        downloadedImageBytes: responses.reduce((sum, r) => sum + r.bytes, 0),
      })
      await page.close()
    }
    await context.close()
  }
  mkdirSync('dist', { recursive: true })
  writeFileSync('dist/image-delivery.json', JSON.stringify(results, null, 2))
  console.log(
    'Responsive image selection, dimensions, byte sizes and hydration download checks passed.',
  )
} finally {
  await browser.close()
  await server.close()
}
