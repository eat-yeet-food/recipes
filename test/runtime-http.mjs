import assert from 'node:assert/strict'
import { startApp } from './app-server.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const server = await startApp(),
  origin = server.url.replace(/\/$/, '')
const evidence = []
try {
  const json = async (path) => {
    const r = await fetch(origin + path)
    assert.equal(r.status, 200, path)
    return r.json()
  }
  const { recipes } = await json('/api/public/recipes'),
    { articles } = await json('/api/public/articles')
  assert.equal(recipes.length, 15)
  assert.equal(articles.length, 5)
  for (const path of [
    '/',
    '/recipes',
    '/browse',
    '/learn',
    ...recipes.map((r) => '/recipes/' + r.slug),
    ...articles.map((a) => '/learn/' + a.slug),
  ]) {
    const response = await fetch(origin + path),
      html = await response.text()
    assert.equal(response.status, 200, path)
    assert.equal((html.match(/<title>/g) || []).length, 1, path + ' title')
    assert.equal(
      (html.match(/rel="canonical"/g) || []).length,
      1,
      path + ' canonical',
    )
    for (const name of [
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'og:image:width',
      'og:image:height',
      'og:image:alt',
      'twitter:card',
    ])
      assert(html.includes(`"${name}"`), path + ' ' + name)
    assert(html.includes('summary_large_image'))
    assert(!html.includes('noindex'), path + ' indexable audit mode')
    if (path.startsWith('/recipes/') || path.startsWith('/learn/')) {
      const scripts = [
        ...html.matchAll(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
        ),
      ].map((m) => JSON.parse(m[1]))
      assert.equal(scripts.length, 2, path)
      assert(!scripts.some((s) => s.aggregateRating || s.nutrition))
      assert(scripts.some((s) => s['@type'] === 'BreadcrumbList'))
    }
    evidence.push({
      path,
      status: response.status,
      bytes: Buffer.byteLength(html),
    })
  }
  const tracking = await (
    await fetch(
      origin + '/recipes/new-york-style-pizza?utm_source=test&formula=unused',
    )
  ).text()
  assert(
    tracking.includes(
      'href="https://eatyeet.com/recipes/new-york-style-pizza"',
    ),
  )
  for (const path of ['/not-real', '/recipes/not-real', '/learn/not-real'])
    assert.equal((await fetch(origin + path)).status, 404, path)
  assert.equal(
    (await fetch(origin + '/api/public/recipes/missing')).status,
    404,
  )
  const search = await (await fetch(origin + '/search?q=pizza')).text()
  assert(search.includes('noindex'))
  const sitemap = await (await fetch(origin + '/sitemap.xml')).text()
  for (const item of [...recipes, ...articles])
    assert(sitemap.includes(item.slug))
  assert(!sitemap.includes('/search'))
  const media = await json('/api/media?limit=100')
  const file = media.docs[0].manifest.variants[0]
  const image = await fetch(origin + file.url)
  assert.equal(image.status, 200)
  assert.match(image.headers.get('content-type'), /^image\//)
  assert.equal(
    Number(image.headers.get('content-length')),
    (await image.arrayBuffer()).byteLength,
  )
  assert.match(image.headers.get('cache-control'), /max-age=31536000/)
  assert(!image.headers.get('cache-control').includes('immutable'))
  assert.equal(
    (
      await fetch(origin + file.url, {
        headers: { 'If-None-Match': image.headers.get('etag') },
      })
    ).status,
    304,
  )
  const absent = await fetch(origin + '/media/' + 'f'.repeat(64) + '/160.avif')
  assert.equal(absent.status, 404)
  assert.equal(absent.headers.get('cache-control'), 'no-store')
  assert(!(absent.headers.get('content-type') || '').includes('text/html'))
  for (const path of [
    '/api/owners',
    '/api/recipes/versions',
    '/api/articles/versions',
  ])
    assert([401, 403].includes((await fetch(origin + path)).status), path)
  for (const path of [
    '/api/owners',
    '/api/owners/first-register',
    '/api/recipes',
    '/api/media',
    '/api/owners/forgot-password',
  ])
    assert(
      [401, 403].includes(
        (
          await fetch(origin + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'intruder@example.com',
              password: 'not-an-owner-password',
            }),
          })
        ).status,
      ),
      path,
    )
  const invalidOrigin = await fetch(origin + '/api/owners/login', {
    method: 'POST',
    headers: {
      Origin: 'https://evil.example',
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  assert.equal(invalidOrigin.status, 403)
  const publicDocs = await json('/api/recipes?limit=1')
  assert(!('sourceHash' in publicDocs.docs[0]))
  assert(!('gitRevision' in publicDocs.docs[0]))
  assert(!('sourceId' in publicDocs.docs[0]))
  assert.equal(
    (await fetch(origin + '/preview/recipes/new-york-style-pizza')).status,
    404,
  )
  mkdirSync('dist', { recursive: true })
  writeFileSync('dist/runtime-http.json', JSON.stringify(evidence, null, 2))
  console.log(
    `HTTP, SEO, media and anonymous authorization checks passed (${evidence.length} public routes).`,
  )
} finally {
  await server.close()
}
