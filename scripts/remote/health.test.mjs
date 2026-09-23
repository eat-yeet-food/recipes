import test from 'node:test'
import assert from 'node:assert/strict'
import { releaseHealth } from './health.mjs'

const origin = 'https://staging.eatyeet.com'
function transport({ badPath, stale = false, openOwner = false } = {}) {
  let attempts = 0
  return async (url, options) => {
    const path = new URL(url).pathname
    if (path === '/api/owners') {
      assert.equal(options.headers, undefined)
      return new Response('', { status: openOwner ? 200 : 403 })
    }
    assert.equal(options.headers.Cookie, 'CF_Authorization=private-session')
    const headers = { 'x-eatyeet-release': 'new', 'content-type': 'text/html' }
    if (path === '/.well-known/eatyeet-release') return Response.json({ releaseId: stale && attempts++ === 0 ? 'old' : 'new', contentRevision: 'sha', status: 'ready' })
    if (path === badPath) return new Response('broken', { status: 503 })
    if (path.startsWith('/api/')) return Response.json({ reviews: [] }, { headers: { 'x-eatyeet-release': 'new' } })
    if (path.startsWith('/_next')) return new Response('js', { headers: { ...headers, 'content-type': 'application/javascript' } })
    return new Response('<main id="main-content"></main><script src="/_next/static/chunk.js"></script>', { headers })
  }
}
const options = { releaseId: 'new', contentRevision: 'sha', accessToken: 'private-session', pause: async () => {} }
test('deploy health checks exact release, rendered pages, assets, ratings and owner protection', async () => {
  await releaseHealth(origin, { ...options, request: transport({ stale: true }) })
  for (const badPath of ['/', '/recipes/new-york-style-pizza', '/api/public/ratings/new-york-style-pizza', '/_next/static/chunk.js'])
    await assert.rejects(releaseHealth(origin, { ...options, request: transport({ badPath }) }), /health failed/)
  await assert.rejects(releaseHealth(origin, { ...options, request: transport({ openOwner: true }) }), /admitted/)
})
