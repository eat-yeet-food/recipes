import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreBookmark, restoredExport, recoveryBookmark, readBackup } from './backups.mjs'
import { identityDigest } from './acceptance.mjs'

test('online recovery points use Time Travel without a blocking SQL export', async () => {
  const objects = new Map(), api = async (path) => {
    assert.equal(path, '/accounts/account/d1/database/db/time_travel/bookmark')
    return { result: { bookmark: 'exact-point' } }
  }
  const store = { write: async (key, value) => objects.set(key, { value }), read: async (key) => objects.get(key) }
  const point = await recoveryBookmark(api, { accountId: 'account', environment: 'production' }, { databaseId: 'db' }, store, {}, 'release')
  assert.equal(point.kind, 'time-travel')
  const recovered = await readBackup(store, {}, point.key)
  assert.equal(recovered.bookmark.bookmark, 'exact-point')
  assert.equal(recovered.databaseId, 'db')
})

test('restore identity comparisons ignore JSON property order but preserve values and row order', () => {
  assert.equal(identityDigest([[{ id: 1, source_id: 'a', source_hash: 'b' }]]), identityDigest([[{ source_hash: 'b', id: 1, source_id: 'a' }]]))
  assert.notEqual(identityDigest([[{ id: 1 }]]), identityDigest([[{ id: 2 }]]))
})

test('isolated D1 export loading accepts child-first table order and still rejects broken references', () => {
  const sql = 'PRAGMA defer_foreign_keys=TRUE; CREATE TABLE child(id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id)); INSERT INTO child VALUES(1,2); CREATE TABLE parent(id INTEGER PRIMARY KEY); INSERT INTO parent VALUES(2);'
  const db = restoredExport(sql)
  try { assert.equal(db.prepare('SELECT parent_id FROM child').get().parent_id, 2); assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1) }
  finally { db.close() }
  assert.throws(() => restoredExport(sql.replace('INSERT INTO parent VALUES(2);', '')), /foreign-key/)
})

test('D1 restore sends an exact bookmark in the query, with no ignored JSON body', async () => {
  const endpoint = '/accounts/account/d1/database/database'
  const result = await restoreBookmark(async (path, options) => {
    const url = new URL(path, 'https://api.cloudflare.com')
    assert.equal(url.pathname, endpoint + '/time_travel/restore')
    assert.equal(url.searchParams.get('bookmark'), 'bookmark+with/reserved=characters')
    assert.equal(options.method, 'POST')
    assert.equal(options.body, undefined)
    return { result: { bookmark: 'restored', previous_bookmark: 'undo' } }
  }, endpoint, 'bookmark+with/reserved=characters')
  assert.deepEqual(result, { bookmark: 'restored', previous_bookmark: 'undo' })
  await assert.rejects(restoreBookmark(() => { throw Error('must not call') }, endpoint, ''), /exact D1/)
})
