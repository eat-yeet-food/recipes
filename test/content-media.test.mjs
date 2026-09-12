import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync,
  writeFileSync,
  unlinkSync,
  statSync,
  readFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { syncMediaItem } from '../packages/l4/content-build/src/media-sync.mjs'
import {
  prepareImage,
  safeImagePath,
} from '../packages/l4/content-build/src/images.mjs'
import { validateAuthored } from '../packages/l4/content-build/src/source-validation.mjs'
test('derivatives cap dimensions, retain aspect ratio, recover missing cache files and address transformations', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eatyeet-media-')),
    source = join(dir, 'source.jpg'),
    cache = join(dir, 'cache')
  writeFileSync(
    source,
    await sharp({
      create: { width: 240, height: 180, channels: 3, background: '#ffcc00' },
    })
      .jpeg()
      .toBuffer(),
  )
  const first = await prepareImage(source, cache)
  assert.deepEqual(
    first.variants.map((v) => v.width),
    [160, 160, 240, 240],
  )
  assert(first.variants.every((v) => v.height === v.width * 0.75))
  assert(first.social.width <= 240)
  assert(first.social.height <= 180)
  const file = join(cache, first.hash, '160.webp'),
    mtime = statSync(file).mtimeMs
  assert.deepEqual(await prepareImage(source, cache), first)
  assert.equal(statSync(file).mtimeMs, mtime)
  unlinkSync(file)
  assert.deepEqual(await prepareImage(source, cache), first)
  assert.equal(
    readFileSync(file).length,
    first.variants.find((v) => v.key.endsWith('160.webp')).bytes,
  )
  const focal = await prepareImage(source, cache, [0, 0])
  assert.notEqual(focal.hash, first.hash)
  writeFileSync(join(dir, 'payload.svg'), '<svg onload="alert(1)"/>')
  assert.throws(() => safeImagePath(dir, 'payload.svg'))
  writeFileSync(join(dir, 'fake.png'), 'executable data')
  await assert.rejects(() => prepareImage(join(dir, 'fake.png'), cache))
})
test('authored validation rejects unsafe URLs, HTML and silently dropped blocks', () => {
  for (const value of [
    { text: '<img src=x onerror=alert(1)>' },
    { text: '[x](javascript:alert%281%29)' },
    { url: 'data:text/html,evil' },
    { blocks: [{ type: 'unknown' }] },
    { prepMinutes: -1 },
    { items: [{ id: 'same' }, { id: 'same' }] },
  ])
    assert.throws(() => validateAuthored(value))
  validateAuthored({
    text: 'Use **strong flour**, then [read more](https://example.com).',
    items: [{ id: '1' }, { id: '2' }],
  })
})

test('failed uploads never publish a new reference and retries reuse successful immutable objects', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eatyeet-upload-')),
    source = join(dir, 'source.png')
  writeFileSync(
    source,
    await sharp({
      create: { width: 160, height: 120, channels: 3, background: '#ffcc00' },
    })
      .png()
      .toBuffer(),
  )
  const manifest = await prepareImage(source, dir),
    objects = new Map()
  let creates = 0,
    attempts = 0,
    fail = true
  const payload = {
    create: async () => {
      creates++
    },
    update: async () => assert.fail('unexpected update'),
  }
  const bucket = {
    head: async (key) => objects.get(key),
    put: async (key, bytes) => {
      attempts++
      if (fail && attempts === 2)
        throw new Error('Simulated upload interruption')
      objects.set(key, { size: bytes.length })
    },
  }
  await assert.rejects(
    () =>
      syncMediaItem(
        payload,
        bucket,
        { manifest, public: true },
        null,
        true,
        dir,
      ),
    /interruption/,
  )
  assert.equal(creates, 0)
  assert.equal(objects.size, 1)
  fail = false
  await syncMediaItem(
    payload,
    bucket,
    { manifest, public: true },
    null,
    true,
    dir,
  )
  assert.equal(creates, 1)
  assert.equal(objects.size, manifest.variants.length + 1)
  const completeAttempts = attempts
  await syncMediaItem(
    payload,
    bucket,
    { manifest, public: true },
    { id: 1 },
    false,
    dir,
  )
  assert.equal(attempts, completeAttempts)
})
