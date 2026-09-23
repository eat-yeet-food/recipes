// Exercise actual Payload nested writes through the same snapshot binding used
// for online releases. No remote services or development database are involved.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { getPayload } from 'payload'
import { createCMSConfig } from '@eat-yeet/l4-content-cms/config'
import { toStoredRecord } from '@eat-yeet/l4-content-model/storage'
import { sourceContent } from '../scripts/content-source.mjs'
import { contentDatabase, contentSnapshot } from '../scripts/remote/atomic-content.mjs'

process.env.DISABLE_PAYLOAD_HMR = 'true'
const batches: number[] = []
const { Miniflare, convertV4MiniflareOptions } = createRequire(import.meta.resolve('wrangler'))('miniflare')
const emulator = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test") } }',
  compatibilityDate: '2026-09-12', d1Databases: { D1: 'atomic-release-test' } }))
const live = await emulator.getD1Database('D1')
const snapshot = contentDatabase('', { assertOwner: async () => {}, remote: {
  prepare: (query: string) => live.prepare(query),
  batch: async (statements: any[]) => { batches.push(statements.length); return live.batch(statements) },
} })
const bucket = { put: async () => {}, get: async () => null, head: async () => null, delete: async () => {} }
const config = createCMSConfig({ D1: snapshot.binding as any, R2: bucket as any }, {
  secret: 'test-only-atomic-content-secret-32-characters', origin: 'http://127.0.0.1:3000', migrationDir: resolve('packages/l8/web/migrations'), push: false,
})
const payload = await getPayload({ config })
for (const name of ['recipes', 'articles', 'categories', 'media']) payload.collections[name].config.lockDocuments = false
for (const global of payload.config.globals) if (global.slug === 'site') global.lockDocuments = false
try {
  await payload.db.migrate()
  const schema = (await contentSnapshot(snapshot.binding)).schema
  for (const type of ['table', 'index']) for (const entry of schema.filter((entry: any) => entry.type === type)) await live.prepare(entry.sql).run()
  const source = sourceContent()
  const recipe = source.records.map(toStoredRecord).find((r: any) => r.collection === 'recipes' && r.data.slug === 'new-york-style-pizza')!
  const created = await snapshot.atomic(() => payload.create({ collection: 'recipes', overrideAccess: true, data: recipe.data }))
  const before = (await live.prepare('SELECT title FROM recipes WHERE id=?').bind(created.id).first()) as any
  assert.equal(before.title, created.title)
  const changed = { ...recipe.data, title: 'Atomic pizza update' }
  await snapshot.atomic(() => payload.update({ collection: 'recipes', id: created.id, overrideAccess: true, data: changed }))
  assert.equal((await live.prepare('SELECT title FROM recipes WHERE id=?').bind(created.id).first() as any).title, changed.title)
  assert.equal(batches.length, 2)
  assert(batches.every((count) => count > 1 && count <= 1000))
  for (const record of source.records.map(toStoredRecord).filter((r: any) => r.data.slug !== recipe.data.slug)) {
    const doc = await snapshot.atomic(() => payload.create({ collection: record.collection as any, overrideAccess: true, data: record.data }))
    await snapshot.atomic(() => payload.update({ collection: record.collection as any, id: doc.id, overrideAccess: true, data: { ...record.data, title: record.data.title + ' updated' } }))
  }
  await snapshot.atomic(() => payload.updateGlobal({ slug: 'site', overrideAccess: true, data: { content: source.site, sourceHash: 'fixture' } }))
  const copied = contentDatabase(await contentSnapshot(live))
  try {
    assert.equal((await copied.binding.prepare('SELECT COUNT(*) AS n FROM recipes').first() as any).n, source.records.filter((r: any) => r.collection === 'recipes').length)
    assert.equal((await copied.binding.prepare('SELECT title FROM recipes WHERE id=?').bind(created.id).first() as any).title, changed.title)
  } finally { copied.close() }
  await assert.rejects(live.batch([live.prepare("UPDATE recipes SET title='must roll back' WHERE id=?").bind(created.id), live.prepare('INSERT INTO no_such_table VALUES(1)')]))
  assert.equal((await live.prepare('SELECT title FROM recipes WHERE id=?').bind(created.id).first()).title, changed.title)
  console.log(`Payload content create/update/global passed against D1 (${batches.length} atomic batches; largest ${Math.max(...batches)} statements).`)

} finally { await payload.destroy(); snapshot.close(); await emulator.dispose() }
