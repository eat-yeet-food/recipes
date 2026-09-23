import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cachedBuild } from './build-cache.mjs'

test('same commit reuses checked bytes across environments without carrying retained assets into the cache', async () => {
  const cwd = process.cwd(), temporary = mkdtempSync(join(tmpdir(), 'build-cache-'))
  process.chdir(temporary)
  let builds = 0
  try {
    mkdirSync('staging/assets', { recursive: true }); mkdirSync('production', { recursive: true })
    const build = async () => { builds++; writeFileSync('staging/worker.js', 'bundle'); writeFileSync('staging/assets/app.js', 'asset'); return { bundleFile: 'staging/worker.js', assetsDirectory: 'staging/assets' } }
    await cachedBuild('a'.repeat(40), 'staging', build)
    writeFileSync('staging/assets/old.js', 'retained')
    const next = await cachedBuild('a'.repeat(40), 'production', build)
    assert.equal(builds, 1)
    assert.equal(readFileSync(next.bundleFile, 'utf8'), 'bundle')
    assert.equal(readFileSync(join(next.assetsDirectory, 'app.js'), 'utf8'), 'asset')
    assert.throws(() => readFileSync(join(next.assetsDirectory, 'old.js')))
    const cached = readdirSync('.local/remote/builds')[0]
    writeFileSync(join('.local/remote/builds', cached, 'assets/app.js'), 'corrupted')
    await assert.rejects(cachedBuild('a'.repeat(40), 'production', build), /checksum mismatch/)
  } finally { process.chdir(cwd); rmSync(temporary, { recursive: true, force: true }) }
})
