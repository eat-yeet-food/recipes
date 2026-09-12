import assert from 'node:assert/strict'
import { it } from 'node:test'
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { startStatic } from './static-server.mjs'

it('serves clean URLs, headers and themed 404s while surviving invalid requests', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'static-server-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const publicDir = join(root, 'public')
  mkdirSync(join(publicDir, 'page'), { recursive: true })
  writeFileSync(join(publicDir, 'page/index.html'), '<h1>Page</h1>')
  writeFileSync(join(publicDir, '404.html'), '<h1>Missing</h1>')
  writeFileSync(join(publicDir, '_headers'), '/*\n  X-Frame-Options: SAMEORIGIN\n\n/page\n  Cache-Control: public, max-age=300\n')
  writeFileSync(join(root, 'private.txt'), 'private')
  symlinkSync(join(root, 'private.txt'), join(publicDir, 'escape.txt'))
  const server = await startStatic(publicDir)
  t.after(() => server.close())
  for (const path of ['%zz', '%00', '..%2fprivate.txt', '%5cprivate.txt']) assert.equal((await fetch(server.url + path)).status, 400)
  for (const path of ['missing', 'escape.txt']) {
    const response = await fetch(server.url + path)
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(await response.text(), '<h1>Missing</h1>')
  }
  const page = await fetch(server.url + 'page')
  assert.equal(page.status, 200)
  assert.equal(page.headers.get('x-frame-options'), 'SAMEORIGIN')
  assert.equal(await page.text(), '<h1>Page</h1>')
  assert.equal(await (await fetch(server.url + 'page', { method: 'HEAD' })).text(), '')
  assert.equal((await fetch(server.url + 'page', { method: 'POST' })).status, 405)
  await assert.rejects(startStatic(publicDir, Number(new URL(server.url).port)), { code: 'EADDRINUSE' })
})
