/**
 * Minimal static server for exercising the web build over real HTTP, where
 * absolute asset paths and separate requests behave as they will in production.
 * Resolves clean URLs to their prerendered index.html the way Pages does.
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
export function startStatic(dir, port = 0) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (path === '/favicon.ico') {
      res.writeHead(204).end()
      return
    }
    // normalize() collapses any ../ before it can escape the served directory.
    const file = join(dir, normalize(path).replace(/^(\.\.[/\\])+/, ''))

    // Clean URLs resolve to a directory's index.html, which is what Cloudflare
    // Pages does for prerendered routes like /recipes/<slug>.
    let target = file
    try {
      if (path.endsWith('/') || statSync(file).isDirectory()) target = join(file, 'index.html')
    } catch {
      target = file
    }

    try {
      if (!statSync(target).isFile()) throw new Error('not a file')
      res.writeHead(200, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' })
      res.end(readFileSync(target))
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('not found')
    }
  })

  // Port 0 lets the OS pick a free one, which is what the tests want; the local
  // preview server passes a fixed port so the URL is stable across restarts.
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise((done) => server.close(done)),
      })
    })
  })
}
