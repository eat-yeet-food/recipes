import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { r2CredentialsFromToken, seal, unseal } from './credentials.mjs'

test('R2 enrollment verifies the token and derives Cloudflare S3 credentials', async () => {
  const token = 'test-token-not-a-real-credential'
  const credentials = await r2CredentialsFromToken(token, async (path) => {
    assert.equal(path, '/user/tokens/verify')
    return { result: { id: 'a'.repeat(32), status: 'active' } }
  })
  assert.equal(credentials.R2_ACCESS_KEY_ID, 'a'.repeat(32))
  assert.equal(credentials.R2_SECRET_ACCESS_KEY, createHash('sha256').update(token).digest('hex'))
})

test('R2 enrollment rejects inactive tokens and malformed provider identities', async () => {
  for (const result of [undefined, { id: 'a'.repeat(32), status: 'expired' }, { id: 'invalid', status: 'active' }]) {
    await assert.rejects(r2CredentialsFromToken('private-value', async () => ({ result })), (error) => {
      assert.match(error.message, /active Cloudflare user API token/)
      assert.ok(!error.message.includes('private-value'))
      return true
    })
  }
})

test('recovery export restores derived credentials and rejects a different passphrase', () => {
  const value = { R2_SECRET_ACCESS_KEY: 'test-secret', PULUMI_CONFIG_PASSPHRASE: 'generated-state-passphrase' }
  const envelope = seal(value, 'nine-char')
  assert.ok(!JSON.stringify(envelope).includes('test-secret'))
  assert.deepEqual(unseal(envelope, 'nine-char'), value)
  assert.throws(() => seal(value, 'eight-ch'), /at least 9 characters/)
  assert.throws(() => unseal(envelope, 'different-recovery-passphrase'))
})
