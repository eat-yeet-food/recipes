import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { archiveAssets, restoreAssets } from './assets.mjs'
import { deploymentManifest, assertDeploymentManifest } from '../../infra/cloudflare/assets.cjs'
import { ObjectStore } from './storage.mjs'
import { concurrent } from './concurrency.mjs'

test('Pulumi asset snapshot rejects changed, missing, extra, mapped and linked files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'eatyeet-deployment-assets-'))
  try {
    const file = join(directory, 'chunk.js')
    writeFileSync(file, 'original')
    const manifest = deploymentManifest(directory)
    assertDeploymentManifest(directory, manifest)
    writeFileSync(file, 'modified')
    assert.throws(() => assertDeploymentManifest(directory, manifest), /differs/)
    rmSync(file)
    assert.throws(() => assertDeploymentManifest(directory, manifest), /differs/)
    writeFileSync(file, 'original')
    writeFileSync(join(directory, 'extra.js'), 'extra')
    assert.throws(() => assertDeploymentManifest(directory, manifest), /differs/)
    writeFileSync(join(directory, 'chunk.js.map'), '{}')
    assert.throws(() => deploymentManifest(directory), /source map/)
    rmSync(join(directory, 'chunk.js.map'))
    symlinkSync(file, join(directory, 'linked.js'))
    assert.throws(() => deploymentManifest(directory), /symlinks/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('archive retries upload only missing bytes and settle concurrent operations before failure', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-reuse-')), metadata = new Map()
  let uploads = 0, reads = 0
  const store = new ObjectStore({ send: async (command) => {
    const value = command.input
    if (command.constructor.name === 'HeadObjectCommand') {
      reads++
      if (!metadata.has(value.Key)) throw Object.assign(new Error('Missing'), { $metadata: { httpStatusCode: 404 } })
      return metadata.get(value.Key)
    }
    assert.equal(command.constructor.name, 'PutObjectCommand')
    uploads++
    metadata.set(value.Key, { ContentLength: value.Body.length, ContentType: value.ContentType, Metadata: value.Metadata })
  } }, 'archive')
  try {
    writeFileSync(join(directory, 'one.js'), 'one')
    writeFileSync(join(directory, 'two.js'), 'two')
    await archiveAssets(store, directory)
    await archiveAssets(store, directory)
    assert.equal(uploads, 2); assert.equal(reads, 4)
    writeFileSync(join(directory, 'two.js'), 'changed')
    await archiveAssets(store, directory)
    assert.equal(uploads, 3)
  } finally { rmSync(directory, { recursive: true, force: true }) }
  let active = 0, finished = 0, peak = 0
  await assert.rejects(concurrent(Array.from({ length: 20 }, (_, i) => i), async (i) => {
    active++; peak = Math.max(peak, active)
    try { await new Promise((resolve) => setTimeout(resolve, 2)); if (i === 0) throw new Error('upload failed') }
    finally { active--; finished++ }
  }), /upload failed/)
  assert.equal(peak, 8); assert.equal(active, 0); assert.equal(finished, 8)
})

test('archived assets restore without the original checkout and detect missing/corrupt uploads', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'eatyeet-artifacts-'))
  const source = join(directory, 'source'), restored = join(directory, 'restored'), objects = new Map()
  const store = { upload: async (key, bytes) => objects.set(key, bytes), bytes: async (key) => { if (!objects.has(key)) throw new Error('Missing upload'); return objects.get(key) } }
  try {
    mkdirSync(join(source, '_next/static'), { recursive: true })
    writeFileSync(join(source, '_next/static/old.js'), 'old chunk')
    writeFileSync(join(source, 'donut-icon.svg'), '<svg/>')
    const manifest = await archiveAssets(store, source)
    rmSync(source, { recursive: true })
    await restoreAssets(store, manifest, restored)
    assert.equal(readFileSync(join(restored, '_next/static/old.js'), 'utf8'), 'old chunk')
    const key = [...objects.keys()][0], original = objects.get(key)
    rmSync(restored, { recursive: true })
    objects.set(key, Buffer.from('corrupt'))
    await assert.rejects(restoreAssets(store, manifest, restored), /checksum/)
    objects.delete(key)
    await assert.rejects(restoreAssets(store, manifest, restored), /Missing upload/)
    objects.set(key, original)
    await assert.rejects(restoreAssets(store, { '/../escape': Object.values(manifest)[0] }, restored), /Invalid archived/)
    await restoreAssets(store, manifest, join(directory, 'retained'), { retainStaticOnly: true })
    assert.equal(readFileSync(join(directory, 'retained/_next/static/old.js'), 'utf8'), 'old chunk')
    assert.throws(() => readFileSync(join(directory, 'retained/donut-icon.svg')))
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
