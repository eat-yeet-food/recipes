import test from 'node:test'
import assert from 'node:assert/strict'
import { ownerAccessSession } from './access-session.mjs'

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
