import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { assertCodeOnly } from './code-only.mjs'
import { ObjectStore } from './storage.mjs'

test('fast releases require healthy existing resources, identical migrations and a complete no-op plan', () => {
  const previous = { status: 'ready', releaseId: 'old', migrations: { initial: 'same' } }
  const plan = { status: 'complete', counts: { created: 0, updated: 0, retired: 0 }, siteChanged: false, mediaChanges: 0 }
  assert.doesNotThrow(() => assertCodeOnly(previous, previous.migrations, plan))
  for (const state of [null, { ...previous, status: 'maintenance' }, { ...previous, releaseId: null }])
    assert.throws(() => assertCodeOnly(state, previous.migrations), /healthy/)
  assert.throws(() => assertCodeOnly(previous, { initial: 'changed' }), /migrations/)
  assert.throws(() => assertCodeOnly(previous, { ...previous.migrations, added: 'new' }), /migrations/)
  for (const changed of [{}, { ...plan, status: 'failed' }, { ...plan, mediaChanges: 1 }, { ...plan, siteChanged: true },
    ...['created', 'updated', 'retired'].map((key) => ({ ...plan, counts: { ...plan.counts, [key]: 1 } }))])
    assert.throws(() => assertCodeOnly(previous, previous.migrations, changed), /unchanged/)
})

test('object reuse validates length, content digest and MIME without writing', async () => {
  const bytes = Buffer.from('image'), metadata = { ContentLength: bytes.length, Metadata: { sha256: createHash('sha256').update(bytes).digest('hex') }, ContentType: 'image/avif' }
  let actual = metadata
  const store = new ObjectStore({ send: async (command) => { assert.equal(command.constructor.name, 'HeadObjectCommand'); return actual } }, 'private')
  assert.equal(await store.matches('key', bytes, 'image/avif'), true)
  for (const value of [{ ...metadata, ContentLength: 1 }, { ...metadata, Metadata: {} }, { ...metadata, ContentType: 'text/html' }]) {
    actual = value
    assert.equal(await store.matches('key', bytes, 'image/avif'), false)
  }
})
