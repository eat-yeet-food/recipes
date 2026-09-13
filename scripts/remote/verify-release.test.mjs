import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyRelease, assertVerificationState, verifyDeployedBundle } from './verify-release.mjs'
import { createHash } from 'node:crypto'

test('deployed source accepts Cloudflare multipart text or files and still rejects differing bytes', async () => {
  const source = 'export default { label: "café" }', hash = createHash('sha256').update(source).digest('hex')
  for (const value of [source, new Blob([source])]) {
    const request = async () => { const body = new FormData(); body.append('worker.js', value); return new Response(body) }
    await verifyDeployedBundle({ accountId: 'account' }, {}, { workerName: 'worker' }, { bundleHash: hash, bundle: source }, request)
    await assert.rejects(verifyDeployedBundle({ accountId: 'account' }, {}, { workerName: 'worker' }, { bundleHash: 'incorrect', bundle: source }, request), /corrupted/)
  }
})
test('provider NFC transport is accounted for while other source changes are rejected', async () => {
  const bundle = 'export default /য়/;', record = { bundle, bundleHash: createHash('sha256').update(bundle).digest('hex') }
  const request = (source) => async () => { const form = new FormData(); form.set('worker.js', source); return new Response(form) }
  const attestation = await verifyDeployedBundle({}, {}, {}, record, request(bundle.normalize('NFC')))
  assert.equal(attestation.normalization, 'NFC')
  await assert.rejects(verifyDeployedBundle({}, {}, {}, record, request(bundle + ' // changed')), /differs/)
})

class Store {
  objects = new Map(); sequence = 0
  async read(key) { return structuredClone(this.objects.get(key) ?? null) }
  async write(key, value, condition = {}) {
    const old = this.objects.get(key)
    if ((condition.IfNoneMatch && old) || (condition.IfMatch && old?.etag !== condition.IfMatch)) throw new Error('Precondition failed')
    const etag = String(++this.sequence); this.objects.set(key, { value: structuredClone(value), etag }); return etag
  }
  async remove(key, etag) { assert.equal(this.objects.get(key)?.etag, etag); this.objects.delete(key) }
}
async function fixture() {
  const operations = new Store(), stateStore = new Store(), events = []
  const bundle = 'export default {}'
  const record = { id: 'release-1', revision: 'a'.repeat(40), phase: 'verify', status: 'failed', migrations: {}, backup: { key: 'original' }, assetManifest: {}, bundle, bundleHash: createHash('sha256').update(bundle).digest('hex') }
  const control = { releaseId: record.id, contentRevision: record.revision, status: 'maintenance', migrations: {}, generation: 'same' }
  await operations.write('releases/release-1.json', record); await operations.write('control.json', control)
  const context = { config: { environment: 'staging', origin: 'https://staging.eatyeet.com' }, credentials: { RELEASE_VERIFY_SECRET: 'test-only' },
    outputs: { releaseId: record.id }, stateStore, operations, revision: () => 'c'.repeat(40), migrations: () => ({}),
    accessSession: async () => { events.push('auth'); return 'test-only-session' },
    verifyBundle: async () => { events.push('bundle') }, command: async (_program, _args, options) => {
      events.push('verify'); assert.equal(options.env.EATYEET_EXPECTED_CONTENT_REVISION, record.revision)
      assert.equal((await operations.read('control.json')).value.status, 'maintenance')
    } }
  return { context, operations, stateStore, events, record, control }
}
test('verification resumes without rebuilding or changing the deployed revision and opens only after checks', async () => {
  const { context, operations, stateStore, events, record } = await fixture()
  await verifyRelease(context, record.id)
  assert.deepEqual(events, ['auth', 'bundle', 'verify'])
  assert.equal((await operations.read('control.json')).value.status, 'ready')
  const completed = (await operations.read('releases/release-1.json')).value
  assert.equal(completed.revision, record.revision)
  assert.equal(completed.verificationRevision, 'c'.repeat(40))
  assert.equal(completed.status, 'complete')
  assert.equal(await stateStore.read('locks/staging.json'), null)
  assert.ok([...operations.objects.keys()].some((key) => key.startsWith('recovery/')))
})
test('wrong release phase, content, outputs or migrations refuse verification-only recovery', async () => {
  const { record, control, context } = await fixture()
  for (const phase of ['upload', 'migrate', 'sync', 'application']) assert.throws(() => assertVerificationState({ ...record, phase }, control, context.outputs, {}), /verification phase/)
  assert.throws(() => assertVerificationState(record, { ...control, contentRevision: 'wrong' }, context.outputs, {}), /identities/)
  assert.throws(() => assertVerificationState(record, control, { releaseId: 'wrong' }, {}), /identities/)
  assert.throws(() => assertVerificationState(record, control, context.outputs, { altered: 'hash' }), /migrations/)
})
test('failed health or bundle checks keep maintenance and retain lock ownership', async () => {
  for (const step of ['command', 'verifyBundle']) {
    const { context, operations, stateStore, record } = await fixture()
    context[step] = async () => { throw new Error('Mismatch') }
    await assert.rejects(verifyRelease(context, record.id), /Mismatch/)
    assert.equal((await operations.read('control.json')).value.status, 'maintenance')
    assert.ok(await stateStore.read('locks/staging.json'))
  }
})
test('a competing release or changed remote generation cannot be reopened by verification', async () => {
  const one = await fixture()
  await one.stateStore.write('locks/staging.json', { token: 'other' })
  await assert.rejects(verifyRelease(one.context, one.record.id), /locked/)
  const two = await fixture()
  two.context.command = async () => two.operations.write('control.json', { ...two.control, generation: 'different' })
  await assert.rejects(verifyRelease(two.context, two.record.id), /changed during verification/)
  assert.equal((await two.operations.read('control.json')).value.status, 'maintenance')
})
