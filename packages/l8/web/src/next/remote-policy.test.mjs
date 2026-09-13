import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, createHmac } from 'node:crypto'
import { remoteRequest, normalizedPath, protectedPath, verifyAccess, verifyReleaseProbe } from './remote-policy.mjs'
import { ProjectionCache } from './projection-cache.mjs'

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key' }
const env = { DEPLOY_ENV: 'production', SITE_URL: 'https://eatyeet.com', MEDIA_ORIGIN: 'https://media.eatyeet.com',
  OWNER_EMAIL: 'owner@example.test', ACCESS_TEAM_DOMAIN: 'eatyeet-test.cloudflareaccess.com', ACCESS_AUDIENCES: 'admin-audience',
  RELEASE_ID: 'test-release', RELEASE_VERIFY_SECRET: 'test-only-release-secret-longer-than-32', INDEXABLE: '1',
  OPERATIONS: { get: async () => ({ json: async () => ({ releaseId: 'test-release', generation: 'v1', status: 'ready' }) }) } }
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
function jwt(overrides = {}, header = {}) {
  const input = `${encode({ alg: 'RS256', kid: 'test-key', ...header })}.${encode({ iss: `https://${env.ACCESS_TEAM_DOMAIN}`, aud: ['admin-audience'], email: env.OWNER_EMAIL, exp: Math.floor(Date.now()/1000)+300, ...overrides })}`
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`
}
const certs = async () => Response.json({ keys: [jwk] })
test('Access verification checks signature, owner, issuer, audience, expiry and algorithm', async () => {
  assert.equal(await verifyAccess(jwt(), env, certs), true)
  for (const overrides of [{ email: 'someone@example.test' }, { iss: 'https://evil.example' }, { aud: ['other-app'] }, { exp: 0 }, { nbf: Date.now() }])
    assert.equal(await verifyAccess(jwt(overrides), env, certs), false)
  assert.equal(await verifyAccess(jwt({}, { alg: 'none' }), env, certs), false)
  assert.equal(await verifyAccess(jwt().slice(0,-10) + 'bad', env, certs), false)
  assert.equal(await verifyAccess(undefined, env, certs), false)
})
test('path classification covers roots and encoded admin paths without protecting public API', () => {
  for (const path of ['/admin', '/admin/', '/admin/a', '/api/owners/login', '/preview/recipes/a']) assert.equal(protectedPath(normalizedPath(env.SITE_URL+path)), true)
  assert.equal(protectedPath(normalizedPath(env.SITE_URL+'/%61dmin')), true)
  assert.equal(protectedPath('/api/public/recipes'), false)
  for (const path of ['/api%2fowners', '/api%252fowners', '/%00']) assert.throws(() => normalizedPath(env.SITE_URL+path))
})
test('alternate hostnames and unauthenticated admin never reach the application', async () => {
  const next = () => { throw new Error('Must not reach application') }
  for (const url of ['https://other.workers.dev/admin', 'https://media.eatyeet.com/admin', 'https://eatyeet.com/admin', 'https://eatyeet.com/api/owners']) {
    const result = await remoteRequest(new Request(url), env, next)
    assert.ok([403,404].includes(result.status))
    assert.match(result.headers.get('cache-control'), /no-store/)
  }
})
test('maintenance and unavailable release state fail closed', async () => {
  for (const operations of [{ get: async () => null }, { get: async () => { throw new Error('R2 down') } },
    { get: async () => ({ json: async () => ({ releaseId: 'x', generation: 'v1', status: 'maintenance' }) }) }]) {
    const response = await remoteRequest(new Request(env.SITE_URL), { ...env, OPERATIONS: operations }, () => Response.json({ leaked: true }))
    assert.equal(response.status, 503)
    assert.match(response.headers.get('cache-control'), /no-store/)
    assert.equal(response.headers.get('retry-after'), '60')
  }
})
test('untrusted internal headers are replaced by current release state', async () => {
  const response = await remoteRequest(new Request(env.SITE_URL, { headers: { 'x-eatyeet-generation': 'stale', 'x-eatyeet-access': 'owner' } }), env, async (request) => {
    assert.equal(request.headers.get('x-eatyeet-generation'), 'v1')
    assert.equal(request.headers.get('x-eatyeet-access'), null)
    return new Response('public', { headers: { 'Cache-Control': 'public, max-age=100' } })
  })
  assert.equal(await response.text(), 'public')
  assert.equal(response.headers.get('x-eatyeet-release'), 'test-release')
  assert.match(response.headers.get('cache-control'), /no-store/)
})
test('maintenance verifier is short-lived and bound to release and origin', async () => {
  const claims = { releaseId: 'test-release', origin: env.SITE_URL, exp: Math.floor(Date.now()/1000)+300 }
  const body = encode(claims)
  const token = `${body}.${createHmac('sha256', env.RELEASE_VERIFY_SECRET).update(body).digest('base64url')}`
  assert.equal(await verifyReleaseProbe(token, env.RELEASE_VERIFY_SECRET, claims, env.SITE_URL), true)
  assert.equal(await verifyReleaseProbe(token, env.RELEASE_VERIFY_SECRET, { releaseId: 'other' }, env.SITE_URL), false)
  assert.equal(await verifyReleaseProbe(token, env.RELEASE_VERIFY_SECRET, claims, 'https://staging.eatyeet.com'), false)
  assert.equal(await verifyReleaseProbe(token, env.RELEASE_VERIFY_SECRET, claims, env.SITE_URL, Date.now()+600000), false)
})

test('warm projections cannot bypass maintenance and retirement switches the generation before reads resume', async () => {
  const cache = new ProjectionCache()
  let state = { releaseId: 'test-release', generation: 'v1', status: 'ready' }
  let published = ['pizza'], loads = 0
  const runtime = { ...env, OPERATIONS: { get: async () => ({ json: async () => ({ ...state }) }) } }
  const next = async (request) => Response.json(await cache.read(
    [runtime.DEPLOY_ENV, runtime.RELEASE_ID, request.headers.get('x-eatyeet-generation')], 'recipes',
    async () => { loads++; return [...published] },
  ))
  const read = () => remoteRequest(new Request(env.SITE_URL), runtime, next)
  assert.deepEqual(await (await read()).json(), ['pizza'])
  assert.deepEqual(await (await read()).json(), ['pizza'])
  assert.equal(loads, 1)
  state.status = 'maintenance'
  published = []
  assert.equal((await read()).status, 503)
  assert.equal(loads, 1)
  state = { ...state, generation: 'v2', status: 'ready' }
  assert.deepEqual(await (await read()).json(), [])
  assert.equal(loads, 2)
})

test('build assets skip release storage without bypassing host or Access protection', async () => {
  const runtime = { ...env, OPERATIONS: { get: () => { throw new Error('Must not read release storage') } } }
  const next = (request) => {
    assert.equal(request.headers.get('x-eatyeet-generation'), null)
    return new Response('script')
  }
  const url = env.SITE_URL + '/_next/static/chunks/page-0123456789abcdef.js'
  const response = await remoteRequest(new Request(url, { headers: { 'x-eatyeet-generation': 'forged' } }), runtime, next)
  assert.equal(await response.text(), 'script')
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable')
  assert.equal((await remoteRequest(new Request(url.replace(env.SITE_URL, 'https://other.workers.dev')), runtime, next)).status, 404)
  assert.equal((await remoteRequest(new Request(url), { ...runtime, DEPLOY_ENV: 'staging' }, next)).status, 403)
  await verifyAccess(jwt(), env, certs)
  const owner = await remoteRequest(new Request(url, { headers: { 'Cf-Access-Jwt-Assertion': jwt() } }), { ...runtime, DEPLOY_ENV: 'staging' }, next)
  assert.equal(await owner.text(), 'script')
  assert.equal(owner.headers.get('cache-control'), 'private, max-age=31536000, immutable')
  assert.match(owner.headers.get('x-robots-tag'), /noindex/)
})

test('only successful public assets get a browser cache lifetime', async () => {
  for (const [path, status, upstream, expected] of [
    ['/fonts/avenir/font.woff2', 200, {}, 'public, max-age=86400, must-revalidate'],
    ['/_next/static/chunks/01234567.js', 304, {}, 'public, max-age=31536000, immutable'],
    ['/_next/static/chunks/01234567.js', 404, {}, 'private, no-store'],
    ['/_next/static/chunks/01234567.js', 200, { 'Set-Cookie': 'session=value' }, 'private, no-store'],
    ['/media/hash/320.avif', 200, { 'Cache-Control': 'public, max-age=31536000' }, 'public, max-age=31536000'],
    ['/media/hash/320.avif', 200, { 'Cache-Control': 'private, no-store' }, 'private, no-store'],
    ['/recipes', 200, { 'Cache-Control': 'public, max-age=3600' }, 'private, no-store'],
  ]) {
    const response = await remoteRequest(new Request(env.SITE_URL + path), env,
      () => new Response(null, { status, headers: upstream }))
    assert.equal(response.headers.get('cache-control'), expected, path + ':' + status)
  }
})

test('maintenance blocks images and pages while build files remain available', async () => {
  const runtime = { ...env, OPERATIONS: { get: async () => ({ json: async () => ({ releaseId: 'test-release', generation: 'two', status: 'maintenance' }) }) } }
  for (const path of ['/', '/media/hash/320.avif']) {
    const response = await remoteRequest(new Request(env.SITE_URL + path), runtime, () => { throw new Error('Must stay closed') })
    assert.equal(response.status, 503)
    assert.match(response.headers.get('cache-control'), /no-store/)
  }
  const response = await remoteRequest(new Request(env.SITE_URL + '/_next/static/chunks/01234567.js'), runtime, () => new Response('script'))
  assert.equal(await response.text(), 'script')
})
