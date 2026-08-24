import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const DEPLOY_MANIFEST_PATH = '.well-known/eat-yeet-deploy.json'

const DEPLOY_MANIFEST_VERSION = 1

export function deploymentIdentity({ appId, cloudflareProject, siteUrl }) {
  return {
    version: DEPLOY_MANIFEST_VERSION,
    appId,
    cloudflareProject,
    siteUrl,
  }
}

export function writeDeployManifest(outDir, identity) {
  const path = join(outDir, DEPLOY_MANIFEST_PATH)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(identity, null, 2)}\n`)
}

export function readDeployManifest(outDir) {
  const path = join(outDir, DEPLOY_MANIFEST_PATH)
  if (!existsSync(path)) {
    throw new Error(`missing deploy manifest: ${DEPLOY_MANIFEST_PATH}`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function assertDeployManifest(outDir, expected) {
  const actual = readDeployManifest(outDir)
  const mismatches = Object.entries(expected).filter(([key, value]) => actual[key] !== value)

  if (actual.version !== DEPLOY_MANIFEST_VERSION || mismatches.length > 0) {
    const details = [
      actual.version !== DEPLOY_MANIFEST_VERSION
        ? `version expected ${DEPLOY_MANIFEST_VERSION}, found ${actual.version}`
        : '',
      ...mismatches.map(([key, value]) => `${key} expected ${value}, found ${actual[key]}`),
    ].filter(Boolean)

    throw new Error(
      `refusing to deploy build output for the wrong app:\n` +
        details.map((detail) => `  - ${detail}`).join('\n'),
    )
  }

  return actual
}
