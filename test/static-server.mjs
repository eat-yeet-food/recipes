/**
 * Minimal static server for exercising the web build over real HTTP, where
 * absolute asset paths and separate requests behave as they will in production.
 * The single-file build is driven over file:// instead and needs none of this.
 */

import { createServer } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

/** Serves `dir` on an ephemeral port. Resolves to { url, close }. */
export function startStatic(dir) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (path === '/favicon.ico') {
      res.writeHead(204).end()
      return
    }
    // normalize() collapses any ../ before it can escape the served directory.
    const file = join(dir, normalize(path).replace(/^(\.\.[/\\])+/, ''))
    const target = path.endsWith('/') ? join(file, 'index.html') : file

    try {
      if (!statSync(target).isFile()) throw new Error('not a file')
      res.writeHead(200, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' })
      res.end(readFileSync(target))
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('not found')
    }
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise((done) => server.close(done)),
      })
    })
  })
}
