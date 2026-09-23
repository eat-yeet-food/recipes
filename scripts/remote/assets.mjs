import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, extname, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { concurrent } from './concurrency.mjs'

const hashAsset = (bytes, extension) => createHash('sha256').update(bytes.toString('base64') + extension).digest('hex').slice(0, 32)

// Content-addressed archives make recovery independent of the releasing laptop.
export async function archiveAssets(store, directory) {
  const { manifest, files } = assetManifest(directory)
  await concurrent([...files], ([hash, file]) => store.upload(`artifacts/assets/${hash}`, file.bytes, 'application/octet-stream'))
  return manifest
}
export async function restoreAssets(store, manifest, directory, { retainStaticOnly = false } = {}) {
  await concurrent(Object.entries(manifest ?? {}), async ([path, asset]) => {
    if (!path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => part === '..' || part === '.')) throw new Error('Invalid archived asset path')
    if (!/^[a-f0-9]{32}$/.test(asset.hash)) throw new Error('Invalid archived asset hash')
    if (retainStaticOnly && !path.startsWith('/_next/static/')) return
    const destination = join(directory, path.slice(1))
    if (existsSync(destination)) {
      const bytes = readFileSync(destination)
      if (bytes.length === asset.size && hashAsset(bytes, extname(path).slice(1)) === asset.hash) return
      if (retainStaticOnly) return
    }
    const bytes = await store.bytes(`artifacts/assets/${asset.hash}`)
    if (bytes.length !== asset.size || hashAsset(bytes, extname(path).slice(1)) !== asset.hash) throw new Error('Archived asset checksum differs')
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, bytes)
  })
}

export function assetManifest(directory) {
  const manifest = {}, files = new Map()
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Release assets cannot contain symlinks')
      const full = join(path, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (entry.name.endsWith('.map')) continue
      const bytes = readFileSync(full), extension = extname(full).slice(1)
      const hash = hashAsset(bytes, extension)
      manifest['/' + relative(directory, full).replaceAll('\\', '/')] = { hash, size: bytes.length }
      files.set(hash, { full, bytes, extension })
    }
  }
  walk(directory)
  return { manifest, files }
}
