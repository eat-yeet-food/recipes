import test from 'node:test'
import assert from 'node:assert/strict'
import { deliverMedia } from './media-delivery.mjs'

const request = (headers) => new Request('https://media.eatyeet.com/media/hash/480.avif', { headers })
function fixture() {
  const stored = new Map(), pending = []
  let gets = 0
  return {
    stored, pending, gets: () => gets,
    options: {
      key: 'hash/480.avif', isPublic: true, generation: 'v1', releaseId: 'release1',
      bucket: { get: async () => { gets++; return { body: 'bytes', size: 5, httpEtag: '"etag"', httpMetadata: { contentType: 'image/avif' } } } },
      edge: { match: async (key) => stored.get(key.url)?.clone(), put: async (key, response) => { stored.set(key.url, response) } },
      waitUntil: (work) => pending.push(work),
    },
  }
}

test('authorized media streams without awaiting the cache write and warm/conditional reads avoid R2', async () => {
  const f = fixture()
  let finish
  const normalPut = f.options.edge.put
  f.options.edge.put = (key, response) => new Promise((resolve) => { finish = () => resolve(normalPut(key, response)) })
  const first = await deliverMedia(request(), f.options)
  assert.equal(await first.text(), 'bytes')
  assert.equal(first.headers.get('content-length'), '5')
  assert.equal(first.headers.get('content-type'), 'image/avif')
  assert.equal(first.headers.get('cache-control'), 'public, max-age=31536000')
  assert.equal(f.stored.size, 0)
  finish(); await Promise.all(f.pending)
  assert.equal((await deliverMedia(request(), f.options)).headers.get('x-eatyeet-media-cache'), 'HIT')
  assert.equal((await deliverMedia(request({ 'if-none-match': '"etag"' }), f.options)).status, 304)
  assert.equal(f.gets(), 1)
  await deliverMedia(request(), { ...f.options, generation: 'v2' })
  assert.equal(f.gets(), 2)
})

test('private media bypasses a previously public cache; missing objects and reloads are not reused', async () => {
  const f = fixture()
  await deliverMedia(request(), f.options); await Promise.all(f.pending)
  const privateResponse = await deliverMedia(request(), { ...f.options, isPublic: false })
  assert.equal(privateResponse.headers.get('cache-control'), 'private, no-store')
  assert.equal(privateResponse.headers.get('x-eatyeet-media-cache'), 'BYPASS')
  await deliverMedia(request({ 'cache-control': 'no-cache' }), f.options)
  assert.equal(f.gets(), 3)
  const missing = await deliverMedia(request(), { ...f.options, generation: 'missing', bucket: { get: async () => null } })
  assert.equal(missing.status, 404)
  assert.equal(missing.headers.get('cache-control'), 'no-store')
  assert.equal(f.stored.size, 1)
})

test('edge-cache read failure still delivers an authorized object', async () => {
  const f = fixture()
  f.options.edge.match = async () => { throw new Error('Cache unavailable') }
  assert.equal(await (await deliverMedia(request(), f.options)).text(), 'bytes')
})

test('HEAD reads only object metadata on a miss and never stores a bodyless cache entry', async () => {
  const f = fixture()
  f.options.bucket.head = async () => ({ size: 5, httpEtag: '"etag"', httpMetadata: { contentType: 'image/avif' } })
  const head = new Request(request(), { method: 'HEAD' })
  const response = await deliverMedia(head, f.options)
  assert.equal(response.status, 200)
  assert.equal(response.body, null)
  assert.equal(response.headers.get('content-length'), '5')
  assert.equal(f.gets(), 0)
  assert.equal(f.pending.length, 0)
})
