import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, extname, dirname } from 'node:path'
import { createHash } from 'node:crypto'

const hashAsset = (bytes, extension) => createHash('sha256').update(bytes.toString('base64') + extension).digest('hex').slice(0, 32)

// Content-addressed archives make recovery independent of the releasing laptop.
export async function archiveAssets(store, directory) {
  const { manifest, files } = assetManifest(directory)
  for (const [hash, file] of files) await store.upload(`artifacts/assets/${hash}`, file.bytes, 'application/octet-stream')
  return manifest
}
export async function restoreAssets(store, manifest, directory, { retainStaticOnly = false } = {}) {
  for (const [path, asset] of Object.entries(manifest ?? {})) {
    if (!path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => part === '..' || part === '.')) throw new Error('Invalid archived asset path')
    if (!/^[a-f0-9]{32}$/.test(asset.hash)) throw new Error('Invalid archived asset hash')
    if (retainStaticOnly && !path.startsWith('/_next/static/')) continue
    const destination = join(directory, path.slice(1))
    if (retainStaticOnly && existsSync(destination)) continue
    const bytes = await store.bytes(`artifacts/assets/${asset.hash}`)
    if (bytes.length !== asset.size || hashAsset(bytes, extname(path).slice(1)) !== asset.hash) throw new Error('Archived asset checksum differs')
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, bytes)
  }
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
export async function uploadAssets(api, accountId, workerName, directory) {
  const { manifest, files } = assetManifest(directory)
  const session = (await api(`/accounts/${accountId}/workers/scripts/${workerName}/assets-upload-session`, {
    method: 'POST', body: JSON.stringify({ manifest }),
  })).result
  let completion = session.buckets.length ? null : session.jwt
  const mime = { js: 'application/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', ico: 'image/x-icon', woff2: 'font/woff2', txt: 'text/plain', html: 'text/html' }
  for (const bucket of session.buckets) {
    const form = new FormData()
    for (const hash of bucket) {
      const file = files.get(hash)
      if (!file) throw new Error('Asset server requested an unknown hash')
      form.append(hash, new Blob([file.bytes.toString('base64')], { type: mime[file.extension] ?? 'application/octet-stream' }), hash)
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/assets/upload?base64=true`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.jwt}` }, body: form, signal: AbortSignal.timeout(120000),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error('Worker asset upload failed')
    completion = result.result?.jwt ?? completion
  }
  if (!completion) throw new Error('Asset upload did not return a completion receipt')
  return { jwt: completion, manifest }
}
