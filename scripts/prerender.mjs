/**
 * Prerender the known route set into .output/public.
 *
 * TanStack Start's built-in prerender path starts a Vite preview server and
 * waits on Nitro's port probe. That probe can fail in restricted loopback
 * environments even when the generated server is healthy, so this project owns
 * the small static export step directly.
 */

import { createServer } from 'node:net'

import { allPaths } from '../site.config.mjs'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.output', 'public')
const SERVER = join(ROOT, '.output', 'server', 'index.mjs')
const HOST = '127.0.0.1'

if (!existsSync(SERVER)) {
  console.error('No server bundle at .output/server/index.mjs - run vite build first.')
  process.exit(1)
}

const index = JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'index.json'), 'utf8'))
const paths = allPaths(index)

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, HOST, () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

async function waitForServer(baseUrl, child) {
  let lastError
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode != null) throw new Error(`Server exited with code ${child.exitCode}`)
    try {
      const res = await fetch(baseUrl)
      if (res.ok) return
      lastError = new Error(`HTTP ${res.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw lastError ?? new Error('Server did not become ready')
}

function outputPath(path) {
  if (path === '/') return join(OUT, 'index.html')
  return join(OUT, path.replace(/^\//, ''), 'index.html')
}

const port = await reservePort()
const baseUrl = `http://${HOST}:${port}`
const child = spawn(process.execPath, [SERVER], {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, HOST, PORT: String(port) },
})

try {
  await waitForServer(baseUrl, child)

  for (const path of paths) {
    const res = await fetch(baseUrl + path)
    if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`)
    const file = outputPath(path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, await res.text())
  }

  console.log(`prerender: ${paths.length} routes -> .output/public`)
} finally {
  child.kill('SIGTERM')
}
