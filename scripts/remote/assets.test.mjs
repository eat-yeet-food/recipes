import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { archiveAssets, restoreAssets } from './assets.mjs'

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
