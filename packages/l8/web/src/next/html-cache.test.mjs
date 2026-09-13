import test from 'node:test'
import assert from 'node:assert/strict'
import { publicHTML } from './html-cache.mjs'
import { remoteRequest } from './remote-policy.mjs'

const html = (value = 'public') => `<!doctype html><html><body><main id="main-content">${value}</main></body></html>`
const response = (value, options = {}) => new Response(html(value), { ...options, headers: { 'content-type': 'text/html; charset=utf-8', ...options.headers } })
function fixture() {
  let state = { status: 'ready', releaseId: 'release-one', generation: 'one' }, renders = 0, reads = 0
  const pending = [], entries = new Map(), requests = []
  const env = { DEPLOY_ENV: 'production', SITE_URL: 'https://eatyeet.com', MEDIA_ORIGIN: 'https://media.eatyeet.com', RELEASE_ID: 'release-one',
    OPERATIONS: { get: async () => { reads++; return { json: async () => state } } } }
  const edge = { match: async (key) => entries.get(key.url)?.clone(), put: async (key, value) => { entries.set(key.url, value) } }
  const context = { waitUntil: (promise) => pending.push(promise) }
  let render = async (request) => { renders++; requests.push(request); return response(state.generation) }
  const get = async (path = '/', options) => {
    const result = await remoteRequest(new Request(new URL(path, env.SITE_URL), options), env,
      (request, admission) => publicHTML(request, env, context, edge, admission, render))
    // Drain the guarded stream even in header-only assertions, like a client.
    return new Response(await result.arrayBuffer(), result)
  }
  return { env, edge, entries, requests, get, state, settle: () => Promise.all(pending),
    setRender: (value) => { render = value }, counts: () => ({ renders, reads }) }
}

test('anonymous HTML hits skip rendering but always reread live admission; browser stays no-store', async () => {
  const f = fixture()
  const first = await f.get()
  assert.equal(first.headers.get('x-eatyeet-html-cache'), 'MISS')
  assert.equal(await first.text(), html('one'))
  await f.settle()
  const hit = await f.get()
  assert.equal(hit.headers.get('x-eatyeet-html-cache'), 'HIT')
  assert.equal(await hit.text(), html('one'))
  assert.match(hit.headers.get('cache-control'), /no-store/)
  assert.deepEqual(f.counts(), { renders: 1, reads: 2 })
  assert.equal([...f.entries.values()][0].headers.get('cache-control'), 'public, max-age=86400')
})

test('warm HTML cannot bypass maintenance, unavailable control, retirement or a new release', async () => {
  const f = fixture()
  await (await f.get()).text(); await f.settle()
  f.state.status = 'maintenance'
  const closed = await f.get()
  assert.equal(closed.status, 503)
  assert.equal(closed.headers.get('retry-after'), '60')
  f.state.generation = 'retired'
  f.state.status = 'ready'
  assert.equal(await (await f.get()).text(), html('retired'))
  await f.settle()
  f.env.RELEASE_ID = 'release-two'
  assert.equal((await f.get()).headers.get('x-eatyeet-html-cache'), 'MISS')
  await f.settle()
  f.env.OPERATIONS.get = async () => { throw new Error('unavailable') }
  assert.equal((await f.get()).status, 503)
  assert.equal(f.counts().renders, 3)
})

test('identity, query, framework, conditional and reload requests never read or populate anonymous HTML', async () => {
  const f = fixture()
  await (await f.get()).text(); await f.settle()
  f.edge.match = () => { throw new Error('must not look up anonymous cache') }
  f.edge.put = () => assert.fail('must not cache this request')
  for (const headers of [
    { cookie: 'payload-token=owner' }, { cookie: '__prerender_bypass=draft' }, { cookie: 'unknown=value' },
    { authorization: 'Bearer owner' }, { 'cf-access-jwt-assertion': 'forged' }, { rsc: '1' },
    { 'next-router-state-tree': 'state' }, { 'next-router-prefetch': '1' }, { 'next-url': '/' },
    { 'x-nextjs-data': '1' }, { 'x-middleware-prefetch': '1' }, { purpose: 'prefetch' }, { 'sec-purpose': 'prefetch' },
    { range: 'bytes=0-1' }, { 'if-none-match': 'etag' }, { 'cache-control': 'no-cache' }, { pragma: 'no-cache' },
    { accept: 'text/x-component' },
  ]) assert.equal((await f.get('/', { headers })).headers.get('x-eatyeet-html-cache'), 'BYPASS', JSON.stringify(headers))
  for (const path of ['/?config=custom', '/?', '/recipes/pizza?config=x', '/search?q=pizza', '/recipes/', '/%72ecipes', '/unknown', '/__html-cache/public-html-v1'])
    assert.equal((await f.get(path)).headers.get('x-eatyeet-html-cache'), 'BYPASS', path)
  assert.equal((await f.get('/', { method: 'HEAD' })).headers.get('x-eatyeet-html-cache'), 'BYPASS')
  assert.equal((await f.get('/', { method: 'POST' })).headers.get('x-eatyeet-html-cache'), 'BYPASS')
  await f.settle()
  assert.equal(f.entries.size, 1)
})

test('cache fills cannot incorporate attacker-controlled forwarding, locale or user agent headers', async () => {
  const f = fixture()
  await (await f.get('/', { headers: { 'x-forwarded-host': 'evil.test', 'x-forwarded-proto': 'http', 'user-agent': 'bot',
    'accept-language': 'other', 'x-eatyeet-generation': 'forged', 'x-eatyeet-access': 'owner' } })).text()
  await f.settle()
  assert.deepEqual(Object.fromEntries(f.requests[0].headers), { accept: 'text/html', 'x-eatyeet-generation': 'one' })
  assert.equal(f.requests[0].url, 'https://eatyeet.com/')
  assert.equal((await f.get('https://other.workers.dev/')).status, 404)
  assert.equal((await f.get('https://media.eatyeet.com/')).status, 404)
  assert.equal((await f.get('/admin')).status, 403)
  assert.equal((await f.get('/preview/recipes/pizza')).status, 403)
})

test('staging, owner admissions and maintenance probes cannot reuse or fill the production cache', async () => {
  const f = fixture()
  for (const [environment, admission, headers] of [
    ['staging', { status: 'ready' }, {}], ['production', { status: 'maintenance' }, {}],
    ['production', { status: 'ready', verification: true }, {}], ['production', { status: 'ready' }, { 'x-eatyeet-access': 'owner' }],
  ]) {
    const result = await publicHTML(new Request(f.env.SITE_URL, { headers: { 'x-eatyeet-generation': 'one', ...headers } }),
      { ...f.env, DEPLOY_ENV: environment }, { waitUntil: () => assert.fail('no cache writes') },
      { match: () => assert.fail('no cache reads') }, admission, async () => response('owner/probe'))
    assert.equal(result.headers.get('x-eatyeet-html-cache'), 'BYPASS')
  }
})

test('cookies, redirects, errors, unknown variants, partial and oversized documents never enter cache', async () => {
  const f = fixture()
  for (const make of [
    () => response('owner', { headers: { 'set-cookie': 'session=private' } }),
    () => response('redirect', { status: 302, headers: { location: '/admin' } }),
    () => response('missing', { status: 404 }), () => response('error', { status: 500 }),
    () => response('localized', { headers: { vary: 'Accept-Language' } }), () => response('vary', { headers: { vary: '*' } }),
    () => Response.json({ value: 'not HTML' }), () => response('x'.repeat(1024 * 1024)),
    () => new Response('<html><main id="main-content">truncated', { headers: { 'content-type': 'text/html' } }),
    () => response('<template data-dgst="error"></template>'), () => response('__next_error__'), () => response('1:E{"digest":"error"}'),
  ]) {
    f.setRender(async () => make())
    await (await f.get()).arrayBuffer()
    await f.settle()
    assert.equal(f.entries.size, 0)
  }
})

test('unavailable cache falls back to a live document and non-HTML responses retain their policy', async () => {
  const f = fixture()
  f.edge.match = async () => { throw new Error('cache unavailable') }
  assert.equal(await (await f.get()).text(), html('one')); await f.settle()
  const json = await publicHTML(new Request(f.env.SITE_URL + '/api/public/recipes'), f.env, {}, f.edge, { status: 'ready' },
    async () => Response.json({}, { headers: { 'cache-control': 'private, no-store' } }))
  assert.equal(json.headers.get('x-eatyeet-html-cache'), null)
  assert.equal(json.headers.get('cache-control'), 'private, no-store')
})

test('cache write failures do not break delivery and interrupted streams cannot become hits', async (t) => {
  t.mock.method(console, 'error', () => {})
  const f = fixture()
  f.edge.put = async () => { throw new Error('cache unavailable') }
  assert.equal(await (await f.get()).text(), html('one'))
  await f.settle()
  assert.equal(f.entries.size, 0)
  f.setRender(async () => new Response(new ReadableStream({ start(controller) { controller.error(new Error('stream interrupted')) } }),
    { headers: { 'content-type': 'text/html' } }))
  await assert.rejects(f.get(), /stream interrupted/)
  await f.settle()
  assert.equal(f.entries.size, 0)
})
