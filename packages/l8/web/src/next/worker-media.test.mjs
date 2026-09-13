import test from 'node:test'
import assert from 'node:assert/strict'
import { publicWorkerMedia } from './worker-media.mjs'
const hash = 'a'.repeat(64), key = `${hash}/480.avif`
function fixture() {
  let published = true, reads = 0, hits = 0
  const env = {
    DEPLOY_ENV: 'production', SITE_URL: 'https://eatyeet.com', RELEASE_ID: 'test',
    D1: { prepare: (sql) => {
      assert.equal(sql, 'SELECT manifest FROM media WHERE source_id = ? AND public = 1 LIMIT 1')
      return { bind: (value) => { assert.equal(value, hash); return { first: async () => {
        reads++
        return published ? { manifest: JSON.stringify({ variants: [{ key }], social: { key: `${hash}/social.jpg` } }) } : null
      } } } }
    } },
    R2: { get: () => assert.fail('Expected cache hit') },
  }
  const edge = { match: async () => { hits++; return new Response('cached', { headers: { ETag: '"image"', 'Content-Type': 'image/avif', 'Cache-Control': 'public, max-age=31536000' } }) } }
  const request = (path = key, origin = 'https://media.eatyeet.com') => new Request(`${origin}/media/${path}`, { headers: { 'x-eatyeet-generation': 'current' } })
  return { env, edge, request, retire: () => { published = false }, counts: () => ({ reads, hits }) }
}
test('every public edge hit requires a fresh Payload publication read; retirement fails closed', async () => {
  const f = fixture()
  for (let i = 0; i < 2; i++) assert.equal(await (await publicWorkerMedia(f.request(), f.env, {}, f.edge)).text(), 'cached')
  assert.deepEqual(f.counts(), { reads: 2, hits: 2 })
  f.retire()
  const retired = await publicWorkerMedia(f.request(), f.env, {}, f.edge)
  assert.equal(retired.status, 404)
  assert.equal(retired.headers.get('cache-control'), 'no-store')
  assert.deepEqual(f.counts(), { reads: 3, hits: 2 })
  assert.equal(await publicWorkerMedia(f.request(key, f.env.SITE_URL), f.env, {}, f.edge), null, 'site-host private reads use Payload authorization')
})
test('unlisted derivatives, originals and malformed paths never reach cached bytes', async () => {
  const f = fixture()
  for (const path of [`${hash}/640.avif`, `${hash}/original.jpg`, `${hash}/480.avif/extra`, 'invalid/480.avif']) {
    assert.equal((await publicWorkerMedia(f.request(path), f.env, {}, f.edge)).status, 404)
  }
  assert.equal(f.counts().hits, 0)
})
test('local and non-media requests use the ordinary app; database errors never fall through to public bytes', async () => {
  const f = fixture()
  assert.equal(await publicWorkerMedia(f.request(), { ...f.env, DEPLOY_ENV: 'local' }, {}, f.edge), null)
  assert.equal(await publicWorkerMedia(new Request(f.env.SITE_URL), f.env, {}, f.edge), null)
  f.env.D1.prepare = () => { throw new Error('Database unavailable') }
  await assert.rejects(publicWorkerMedia(f.request(), f.env, {}, f.edge), /Database unavailable/)
  assert.equal(f.counts().hits, 0)
})
