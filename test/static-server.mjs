/** Loopback-only preview/test server for the static Pages output. */
import { createServer } from 'node:http'
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
}
const inside = (file, root) => {
  const rel = relative(root, file)
  return rel === '' || (rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel))
}

function headerRules(root) {
  const file = join(root, '_headers')
  if (!existsSync(file)) return []
  const rules = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('/')) rules.push({ path: line.trim(), headers: {} })
    else if (/^\s+[^:]+:/.test(line) && rules.length) {
      const split = line.indexOf(':')
      rules.at(-1).headers[line.slice(0, split).trim().toLowerCase()] = line.slice(split + 1).trim()
    }
  }
  return rules
}

/** Serves an existing directory; startup errors reject and malformed requests return 400. */
export async function startStatic(dir, port = 0) {
  const root = realpathSync(dir)
  const rules = headerRules(root)
  const server = createServer((req, res) => {
    let path
    try {
      path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      if (path.includes('\0') || path.includes('\\') || path.split('/').includes('..')) throw new Error('invalid path')
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain' }).end('bad request')
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' }).end()
      return
    }
    if (path === '/favicon.ico') { res.writeHead(204).end(); return }
    const headers = {}
    for (const rule of rules) {
      if (rule.path === path || (rule.path.endsWith('*') && path.startsWith(rule.path.slice(0, -1)))) {
        for (const [name, value] of Object.entries(rule.headers)) headers[name] = headers[name] ? `${headers[name]}, ${value}` : value
      }
    }
    const sendFile = (target, status) => {
      if (!inside(realpathSync(target), root) || !statSync(target).isFile()) throw new Error('not a public file')
      const content = readFileSync(target)
      res.writeHead(status, { ...headers, 'content-type': TYPES[extname(target)] ?? 'application/octet-stream', ...(status === 404 ? { 'cache-control': 'no-store' } : {}) })
      res.end(req.method === 'HEAD' ? undefined : content)
    }
    const file = resolve(root, '.' + path)
    try {
      if (!inside(file, root)) throw new Error('outside public root')
      sendFile(statSync(file).isDirectory() ? join(file, 'index.html') : file, 200)
    } catch {
      try { sendFile(join(root, '404.html'), 404) } catch {
        res.writeHead(404, { ...headers, 'content-type': 'text/plain', 'cache-control': 'no-store' }).end(req.method === 'HEAD' ? undefined : 'not found')
      }
    }
  })
  return new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      done({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((closed, fail) => server.close((error) => error ? fail(error) : closed())) })
    })
  })
}
