import { test } from 'node:test'
import assert from 'node:assert/strict'
import { environmentSecrets, deploymentCredentials, restoreOperator, setupOperator } from './operator.mjs'
import { seal, unseal } from './credentials.mjs'

const config = { accountId: 'a'.repeat(32), zoneId: 'b'.repeat(32) }
const operator = { version: 1, ...config, CLOUDFLARE_API_TOKEN: 'operator-token',
  R2_ACCESS_KEY_ID: 'operator-r2-id', R2_SECRET_ACCESS_KEY: 'operator-r2-secret', RECOVERY_EXPORTED_AT: 'exported' }
const entries = () => Object.fromEntries(['bootstrap', 'staging', 'production'].map((env) => [env, {
  ...environmentSecrets(), RECOVERY_EXPORTED_AT: 'exported',
}]))

test('one operator changes deployment credentials without changing environment secrets', () => {
  const local = entries()
  const read = (_, name) => name === 'operator' ? operator : local[name]
  const staging = deploymentCredentials('staging', read, config)
  const production = deploymentCredentials('production', read, config)
  assert.equal(staging.CLOUDFLARE_API_TOKEN, production.CLOUDFLARE_API_TOKEN)
  for (const name of ['PAYLOAD_SECRET', 'PULUMI_CONFIG_PASSPHRASE', 'RELEASE_VERIFY_SECRET']) {
    assert.equal(staging[name], local.staging[name])
    assert.equal(production[name], local.production[name])
    assert.notEqual(staging[name], production[name])
  }
  assert.deepEqual(environmentSecrets(local.staging), local.staging)
  assert.throws(() => environmentSecrets({ PAYLOAD_SECRET: 'existing' }), /restore them/)
})

test('operator selection fails closed on wrong ownership, incomplete recovery, or malformed credentials', () => {
  const local = environmentSecrets()
  for (const invalid of [{ ...operator, accountId: 'wrong' }, { ...operator, RECOVERY_EXPORTED_AT: undefined }, { ...operator, CLOUDFLARE_API_TOKEN: undefined }]) {
    assert.throws(() => deploymentCredentials('staging', (_, name) => name === 'operator' ? invalid : local, config))
  }
  assert.throws(() => deploymentCredentials(undefined, () => local, config), /Explicit --env/)
  assert.throws(() => deploymentCredentials('production', (_, name) => name === 'operator' ? operator : local, config), /recovery kit/)
  assert.equal(deploymentCredentials('staging', (_, name) => name === 'operator' ? null : local, config), local)
})

test('one encrypted recovery kit restores all environments and refuses partial or cross-account kits before writes', () => {
  const bundle = { kind: 'eatyeet-operator-recovery', version: 1, operator, environments: entries() }
  const encrypted = seal(bundle, 'nine-char')
  assert.ok(!JSON.stringify(encrypted).includes('operator-token'))
  const restored = unseal(encrypted, 'nine-char'), saved = {}
  restoreOperator(restored, (_, name, value) => { saved[name] = value }, config)
  assert.deepEqual(saved.operator, operator)
  assert.deepEqual(saved.production, bundle.environments.production)
  for (const invalid of [{ ...bundle, environments: { staging: bundle.environments.staging } }, { ...bundle, operator: { ...operator, zoneId: 'wrong' } }]) {
    let writes = 0
    assert.throws(() => restoreOperator(invalid, () => writes++, config))
    assert.equal(writes, 0)
  }
  assert.throws(() => unseal(encrypted, 'wrong-key'))
})

test('interrupted one-token setup reuses existing and newly generated secrets on retry', async () => {
  const existing = entries()
  const saved = { bootstrap: existing.bootstrap, staging: { ...existing.staging, CLOUDFLARE_API_TOKEN: 'enrolled-token' } }
  const read = (action, name, value) => {
    if (action === 'get-optional') return saved[name] ?? null
    if (action === 'get') return saved[name]
    if (action === 'create') assert.ok(!saved[name])
    saved[name] = value
  }
  const options = { config, from: 'staging', read,
    inspect: async () => config, derive: async () => ({ R2_ACCESS_KEY_ID: 'id', R2_SECRET_ACCESS_KEY: 'secret' }),
    prompt: async () => { throw new Error('operator cancelled') },
  }
  await assert.rejects(setupOperator(options), /operator cancelled/)
  assert.equal(saved.bootstrap, existing.bootstrap)
  assert.equal(saved.staging.PAYLOAD_SECRET, existing.staging.PAYLOAD_SECRET)
  const production = { ...saved.production }
  await assert.rejects(setupOperator(options), /operator cancelled/)
  assert.deepEqual(saved.production, production)
  assert.throws(() => deploymentCredentials('production', read, config), /recovery kit/)
})
