import { DatabaseSync } from 'node:sqlite'
import { concurrent } from './concurrency.mjs'

const ownedTable = (name) => /^(?:recipes|articles|categories|media|site|_+recipes_v|_+articles_v|_+categories_v|_+site_v)(?:_|$)/.test(name)
const identifier = (name) => '"' + name.replaceAll('"', '""') + '"'

// D1's export API blocks database requests. Read only Git-owned rows through
// ordinary paged SELECTs instead. The release lock makes those tables stable;
// live reviews and owner sessions are neither read nor restored.
export async function contentSnapshot(binding) {
  const schema = (await binding.prepare("SELECT name, tbl_name, type, sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL").all()).results
    .filter((entry) => ownedTable(entry.tbl_name))
  const tables = schema.filter((entry) => entry.type === 'table').map((entry) => ({ name: entry.name, rows: [] }))
  await concurrent(tables, async (table) => {
    for (let offset = 0; ; offset += 250) {
      const { results } = await binding.prepare(`SELECT * FROM ${identifier(table.name)} LIMIT 250 OFFSET ?`).bind(offset).all()
      table.rows.push(...results)
      if (results.length < 250) break
    }
  })
  const sequences = (await binding.prepare("SELECT name FROM sqlite_master WHERE name='sqlite_sequence'").all()).results.length
    ? (await binding.prepare('SELECT name, seq FROM sqlite_sequence').all()).results.filter((entry) => ownedTable(entry.name)) : []
  return { schema, tables, sequences }
}

// Payload's D1 adapter updates nested blocks in separate statements. Execute a
// content operation against a private snapshot, then send its writes to D1 in
// one atomic batch. The shared writer lock excludes other Git-content writers;
// reviews and owner sessions stay live and are never copied back from the snapshot.
/** @param {any} sql @param {{remote?: any, assertOwner?: () => Promise<void>, maxStatements?: number}} options */
export function contentDatabase(sql, { remote, assertOwner, maxStatements = 1000 } = {}) {
  const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false })
  try {
    if (typeof sql === 'string') db.exec(sql)
    else {
      for (const entry of sql.schema.filter((entry) => entry.type === 'table')) db.exec(entry.sql)
      for (const table of sql.tables) for (const row of table.rows) {
        const columns = Object.keys(row)
        db.prepare(`INSERT INTO ${identifier(table.name)} (${columns.map(identifier).join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row))
      }
      for (const { name, seq } of sql.sequences) {
        db.prepare('DELETE FROM sqlite_sequence WHERE name=?').run(name)
        db.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)').run(name, seq)
      }
      for (const entry of sql.schema.filter((entry) => entry.type === 'index')) db.exec(entry.sql)
    }
    db.exec('PRAGMA foreign_keys=ON')
  }
  catch (error) { db.close(); throw error }
  let pending = null, poisoned = false
  function execute(query, params, raw = false, columnNames = false) {
    const write = /^\s*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(query)
    if (pending && write) {
      const table = query.match(/^\s*(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE|DELETE\s+FROM)\s+["`]?([a-zA-Z_][a-zA-Z_0-9]*)/i)?.[1]
      if (!table || !ownedTable(table))
        throw new Error('Atomic content sync attempted a write outside Git-owned tables')
      if (/^(recipes|articles|categories|media|site)$/.test(table) && /^\s*(?:DELETE|REPLACE|INSERT\s+OR\s+REPLACE)\b/i.test(query))
        throw new Error('Git-owned parent records must be retired, never deleted or replaced')
      pending.push({ query, params })
    } else if (pending && !/^\s*(?:SELECT|PRAGMA\s+table_info)\b/i.test(query)) {
      throw new Error('Unsupported SQL in atomic content sync')
    }
    const statement = db.prepare(query)
    const columns = statement.columns().map((column) => column.name)
    let results = [], changes = 0, lastRowId = 0
    if (columns.length) {
      if (raw) statement.setReturnArrays(true)
      results = statement.all(...params)
      if (write) ({ changes, lastRowId } = db.prepare('SELECT changes() AS changes, last_insert_rowid() AS lastRowId').get())
    } else {
      const result = statement.run(...params)
      changes = Number(result.changes); lastRowId = Number(result.lastInsertRowid)
    }
    if (raw) return columnNames ? [columns, ...results] : results
    return { success: true, results, meta: { changes, rows_written: changes, last_row_id: lastRowId, duration: 0 } }
  }
  const binding = {
    prepare(query) {
      const prepared = (params) => ({
        bind: (...values) => prepared(values),
        all: async () => execute(query, params),
        run: async () => execute(query, params),
        raw: async (options = {}) => execute(query, params, true, options.columnNames),
        first: async (column) => { const row = execute(query, params).results[0] ?? null; return column ? row?.[column] ?? null : row },
      })
      return prepared([])
    },
    batch: async (statements) => Promise.all(statements.map((statement) => statement.all())),
    exec: async (query) => { if (pending) throw new Error('Schema changes cannot run inside content sync'); db.exec(query); return { count: 1, duration: 0 } },
  }
  return {
    binding,
    async atomic(operation) {
      if (poisoned) throw new Error('Content snapshot must be reopened after a failed batch')
      if (pending) return operation()
      pending = []
      db.exec('SAVEPOINT content_write')
      try {
        const result = await operation()
        if (pending.length > maxStatements) throw new Error('Content operation exceeds one atomic D1 batch; split the authored document before deploying')
        if (pending.length) {
          await assertOwner()
          await remote.batch(pending.map(({ query, params }) => remote.prepare(query).bind(...params)))
        }
        db.exec('RELEASE content_write')
        return result
      } catch (error) {
        poisoned = true
        db.exec('ROLLBACK TO content_write'); db.exec('RELEASE content_write')
        throw error
      } finally { pending = null }
    },
    close: () => db.close(),
  }
}
