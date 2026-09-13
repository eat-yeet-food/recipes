import test from 'node:test'
import assert from 'node:assert/strict'
import { ProjectionCache } from './projection-cache.mjs'

test('completed public reads are isolated by environment, schema, release and content generation', async () => {
  const cache = new ProjectionCache()
  let reads = 0
  const load = async () => ({ recipes: [{ title: 'Published', read: ++reads }] })
  const namespace = ['production', 'v1', 'release1', 'generation1']
  const first = await cache.read(namespace, 'recipes', load)
  first.recipes[0].title = 'Caller mutation'
  assert.equal((await cache.read(namespace, 'recipes', load)).recipes[0].title, 'Published')
  assert.equal(reads, 1)
  for (let i = 0; i < namespace.length; i++) {
    const changed = [...namespace]
    changed[i] = 'different'
    await cache.read(changed, 'recipes', load)
  }
  assert.equal(reads, 5)
})

test('missing documents, failures and oversized entries are never retained', async () => {
  const cache = new ProjectionCache(100)
  await assert.rejects(cache.read('v1', 'a', async () => { throw new Error('Unavailable') }))
  await cache.read('v1', 'a', async () => null)
  await cache.read('v1', 'large', async () => 'x'.repeat(100))
  assert.equal(cache.entries.size, 0)
  assert.equal(await cache.read('v1', 'a', async () => 'recovered'), 'recovered')
})

test('entry and byte limits evict least recently used values', async () => {
  const cache = new ProjectionCache(1024, 2)
  const read = (key) => cache.read('v1', key, async () => key)
  await read('a'); await read('b'); await read('a'); await read('c')
  assert.equal(cache.entries.size, 2)
  assert.equal(cache.entries.has(JSON.stringify(['v1', 'b'])), false)
  const bounded = new ProjectionCache(100)
  for (let i = 0; i < 100; i++) await bounded.read('v1', String(i), async () => 'entry')
  assert.ok(bounded.bytes <= 100)
})
