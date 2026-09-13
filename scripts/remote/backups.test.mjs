import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreBookmark } from './backups.mjs'
import { identityDigest } from './acceptance.mjs'

test('restore identity comparisons ignore JSON property order but preserve values and row order', () => {
  assert.equal(identityDigest([[{ id: 1, source_id: 'a', source_hash: 'b' }]]), identityDigest([[{ source_hash: 'b', id: 1, source_id: 'a' }]]))
  assert.notEqual(identityDigest([[{ id: 1 }]]), identityDigest([[{ id: 2 }]]))
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
