import { cpSync, mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { digest } from './process.mjs'
import { deploymentManifest } from '../../infra/cloudflare/assets.cjs'

export async function cachedBuild(revision, directory, build) {
  const buildEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(NEXT_PUBLIC_|SITE_|ACTIVE_APP|NODE_ENV)/.test(name)).sort())
  const key = `${revision}-${digest(JSON.stringify([process.version, process.platform, process.arch, buildEnvironment])).slice(0, 12)}`
  const cache = resolve('.local/remote/builds', key)
  let receipt
  if (existsSync(resolve(cache, 'receipt.json'))) {
    receipt = JSON.parse(readFileSync(resolve(cache, 'receipt.json'), 'utf8'))
    if (receipt.revision !== revision || digest(readFileSync(resolve(cache, 'worker.js'))) !== receipt.bundleHash ||
      JSON.stringify(deploymentManifest(resolve(cache, 'assets'))) !== JSON.stringify(receipt.assets))
      throw new Error(`Cached build checksum mismatch: ${cache}. Remove this build cache and retry.`)
    console.log(`Reusing verified build for ${revision.slice(0, 12)}`)
  } else {
    const built = await build()
    const temporary = `${cache}-${randomUUID()}`
    mkdirSync(temporary, { recursive: true, mode: 0o700 })
    cpSync(built.bundleFile, resolve(temporary, 'worker.js'))
    cpSync(built.assetsDirectory, resolve(temporary, 'assets'), { recursive: true })
    receipt = { revision, bundleHash: digest(readFileSync(built.bundleFile)), assets: deploymentManifest(built.assetsDirectory) }
    writeFileSync(resolve(temporary, 'receipt.json'), JSON.stringify(receipt), { mode: 0o600 })
    renameSync(temporary, cache)
    return built
  }
  const bundleFile = resolve(directory, 'worker.js'), assetsDirectory = resolve(directory, 'assets')
  cpSync(resolve(cache, 'worker.js'), bundleFile)
  cpSync(resolve(cache, 'assets'), assetsDirectory, { recursive: true })
  return { bundleFile, assetsDirectory }
}
