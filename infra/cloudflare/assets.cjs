const { readdirSync, readFileSync } = require('node:fs')
const { join, relative } = require('node:path')
const { createHash } = require('node:crypto')

// This is the exact set of bytes the pinned provider may upload. Unlike the
// archive codec, reject source maps rather than silently ignoring them.
function deploymentManifest(directory) {
  const manifest = {}
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(path, entry.name)
      if (entry.isSymbolicLink()) throw new Error('Deployment assets cannot contain symlinks')
      if (entry.isDirectory()) { walk(full); continue }
      if (!entry.isFile() || entry.name.endsWith('.map')) throw new Error('Deployment assets contain an unsupported file or source map')
      const bytes = readFileSync(full)
      manifest['/' + relative(directory, full).replaceAll('\\', '/')] = {
        sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length,
      }
    }
  }
  walk(directory)
  return manifest
}

function assertDeploymentManifest(directory, expected) {
  if (!expected || JSON.stringify(deploymentManifest(directory)) !== JSON.stringify(expected)) {
    throw new Error('Deployment asset manifest differs from the release snapshot')
  }
}

module.exports = { deploymentManifest, assertDeploymentManifest }
