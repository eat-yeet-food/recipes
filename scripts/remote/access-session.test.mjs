import test from 'node:test'
import assert from 'node:assert/strict'
import { ownerAccessSession, deployAccessSession } from './access-session.mjs'

test('normal-browser login captures a session without requiring a testing browser or TTY', async () => {
  const calls = []
  const token = await ownerAccessSession('https://staging.eatyeet.com', { execute: async (_binary, args, options) => {
    calls.push(args)
    if (args[0] === '--version') return { stdout: 'cloudflared version 2026.9.1 (test)' }
    assert.equal(options.timeout, 600000)
    return { stdout: 'eyJfixture.payload.signature\n' }
  } })
  assert.equal(token, 'eyJfixture.payload.signature')
  assert.deepEqual(calls[1], ['access', 'login', '--no-verbose', 'https://staging.eatyeet.com'])
})
test('login never exposes captured credentials in errors and rejects unconfigured origins', async () => {
  await assert.rejects(ownerAccessSession('https://staging.eatyeet.com', { execute: async () => { throw new Error('private-token-value') } }), (error) => !error.message.includes('private-token-value'))
  await assert.rejects(ownerAccessSession('https://unconfigured.example'), /Unconfigured/)
})
test('staging deploys exchange the enrolled service token for an Access JWT without a browser', async () => {
  const stored = { ACCESS_CLIENT_ID: 'id.access', ACCESS_CLIENT_SECRET: 'private-secret' }
  const token = await deployAccessSession('https://staging.eatyeet.com', { read: () => stored, fallback: () => assert.fail('no browser'),
    request: async (url, options) => {
      assert.equal(options.headers['CF-Access-Client-Secret'], 'private-secret')
      return new Response(null, { status: 200, headers: { 'Set-Cookie': 'CF_Authorization=eyJa.b.c; Path=/; Secure; HttpOnly' } })
    } })
  assert.equal(token, 'eyJa.b.c')
  await assert.rejects(deployAccessSession('https://staging.eatyeet.com', { read: () => stored, request: async () => new Response(null, { status: 403 }) }),
    (error) => /not accepted/.test(error.message) && !error.message.includes('private-secret'))
  assert.equal(await deployAccessSession('https://staging.eatyeet.com', { read: () => undefined, fallback: async () => 'browser' }), 'browser')
  await assert.rejects(deployAccessSession('https://eatyeet.com'), /staging-only/)
})
