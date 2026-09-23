import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { contentDatabase } from './atomic-content.mjs'

test('content changes commit together while concurrent reviews survive; failed batches leave the old document intact', async () => {
  const sql = `CREATE TABLE recipes(id INTEGER PRIMARY KEY, title TEXT);
    CREATE TABLE recipes_blocks(id INTEGER PRIMARY KEY, recipe_id INTEGER REFERENCES recipes(id), body TEXT);
    CREATE TABLE recipe_ratings(id INTEGER PRIMARY KEY, score INTEGER);
    INSERT INTO recipes VALUES(1,'old'); INSERT INTO recipes_blocks VALUES(1,1,'old block');`
  const live = new DatabaseSync(':memory:')
  live.exec(sql)
  let writes = 0
  const mirror = contentDatabase(sql, { assertOwner: async () => {}, remote: {
    prepare: (query) => ({ bind: (...params) => ({ query, params }) }),
    batch: async (statements) => {
      assert.equal(live.prepare('SELECT title FROM recipes').get().title, 'old')
      live.exec('BEGIN')
      try {
        for (const { query, params } of statements) live.prepare(query).run(...params)
        live.exec('COMMIT'); writes++
      } catch (error) { live.exec('ROLLBACK'); throw error }
    },
  } })
  try {
    live.exec('INSERT INTO recipe_ratings VALUES(1,5)')
    const update = () => mirror.atomic(async () => {
      await mirror.binding.prepare('UPDATE recipes SET title = ? WHERE id=1').bind('new').run()
      await mirror.binding.prepare('DELETE FROM recipes_blocks WHERE recipe_id=1').run()
      await mirror.binding.prepare('INSERT INTO recipes_blocks VALUES(2,1,?)').bind('new block').run()
      assert.equal(live.prepare('SELECT body FROM recipes_blocks').get().body, 'old block')
    })
    await update()
    assert.equal(writes, 1)
    assert.equal(live.prepare('SELECT title FROM recipes').get().title, 'new')
    assert.equal(live.prepare('SELECT score FROM recipe_ratings').get().score, 5)
  } finally { mirror.close(); live.close() }
  const rejected = contentDatabase(sql, { assertOwner: async () => {}, remote: { prepare: (query) => ({ bind: (...params) => ({ query, params }) }), batch: async () => { throw new Error('D1 failure') } } })
  try {
    await assert.rejects(rejected.atomic(() => rejected.binding.prepare("UPDATE recipes SET title='bad'").run()), /D1 failure/)
    assert.equal((await rejected.binding.prepare('SELECT title FROM recipes').first()).title, 'old')
    await assert.rejects(rejected.atomic(() => {}), /reopened/)
  } finally { rejected.close() }
})

test('atomic content cannot write authentication, ratings, schema or oversized batches', async () => {
  const sql = 'CREATE TABLE owners(id INTEGER); CREATE TABLE recipe_ratings(id INTEGER); CREATE TABLE recipes(id INTEGER);'
  for (const query of ['INSERT INTO owners VALUES(1)', 'INSERT INTO recipe_ratings VALUES(1)', 'DROP TABLE recipes']) {
    const db = contentDatabase(sql, { remote: { batch: () => assert.fail('must not write') }, assertOwner: async () => {} })
    try { await assert.rejects(db.atomic(() => db.binding.prepare(query).run()), /outside Git-owned|Unsupported SQL/) }
    finally { db.close() }
  }
  const db = contentDatabase(sql, { maxStatements: 1, remote: { batch: () => assert.fail('must not split') } })
  try {
    await assert.rejects(db.atomic(async () => {
      await db.binding.prepare('INSERT INTO recipes VALUES(1)').run()
      await db.binding.prepare('INSERT INTO recipes VALUES(2)').run()
    }), /one atomic D1 batch/)
  } finally { db.close() }
})
