import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, createHmac } from 'node:crypto'
import { remoteRequest, normalizedPath, protectedPath, verifyAccess, verifyReleaseProbe } from './remote-policy.mjs'

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
