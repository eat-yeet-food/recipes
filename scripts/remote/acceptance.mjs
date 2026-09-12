import { DatabaseSync } from 'node:sqlite'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ObjectStore } from './storage.mjs'
import { databaseBackup, readBackup } from './backups.mjs'
import { command, cleanRevision, digest } from './process.mjs'
import { ownerAccessSession } from './access-session.mjs'

export async function rehearseRestore({ config, credentials, client, api, outputs, lock }) {
  if (config.environment !== 'staging') throw new Error('Restore rehearsal is restricted to staging')
  const store = new ObjectStore(client, outputs.operationsBucket)
  const control = (await store.read('control.json'))?.value
  if (control?.status !== 'ready') throw new Error('A healthy staging release is required')
  await store.write('control.json', { ...control, status: 'maintenance' })
  await new Promise((resolve) => setTimeout(resolve, 35000))
  const endpoint = `/accounts/${config.accountId}/d1/database/${outputs.databaseId}`
  const query = async (sql) => (await api(`${endpoint}/query`, { method: 'POST', body: JSON.stringify({ sql }) })).result
  const sql = "SELECT id, source_id, source_hash FROM recipes ORDER BY id; SELECT id, source_id, source_hash FROM articles ORDER BY id; SELECT id, email FROM owners ORDER BY id;"
  const before = digest(JSON.stringify((await query(sql)).map((result) => result.results)))
  const backup = await databaseBackup(api, config, outputs, store, credentials, `time-travel-${Date.now()}`)
  await lock.assertOwner()
  await query('CREATE TABLE eatyeet_restore_probe (id INTEGER PRIMARY KEY); INSERT INTO eatyeet_restore_probe VALUES (1);')
  await api(`${endpoint}/time_travel/restore`, { method: 'POST', body: JSON.stringify({ bookmark: backup.bookmark.bookmark }) })
  const probe = await query("SELECT name FROM sqlite_master WHERE name = 'eatyeet_restore_probe'")
  const after = digest(JSON.stringify((await query(sql)).map((result) => result.results)))
  if (probe[0].results.length || before !== after) throw new Error('Staging Time Travel did not restore the expected content and owner identities')
  await lock.assertOwner()
  await store.write(`rehearsals/${control.contentRevision}.json`, { timeTravelVerified: true, checkedAt: new Date().toISOString(), backup: backup.key })
  await store.write('control.json', { ...control, generation: `restored-${Date.now()}`, status: 'ready' })
  console.log('Staging Time Travel and content/owner identity verification passed.')
}

export async function acceptStaging({ config, credentials, client, api, outputs, lock, stateStore }, ownerReviewed) {
  if (config.environment !== 'staging') throw new Error('Acceptance rehearsal runs against staging only')
  const revision = cleanRevision()
  const store = new ObjectStore(client, outputs.operationsBucket)
  const control = (await store.read('control.json'))?.value
  if (control?.status !== 'ready' || control.contentRevision !== revision) throw new Error('Staging must have a completed release of this commit')
  const session = await ownerAccessSession(config.origin)
  await command('node', ['test/verify-prod.mjs', config.origin], { env: { EATYEET_ACCESS_TOKEN: session, EATYEET_EXPECTED_RELEASE: control.releaseId } })
  await command('node', ['test/remote-performance.mjs', config.origin], { env: { EATYEET_ACCESS_TOKEN: session } })
  await lock.assertOwner()
  const backup = await databaseBackup(api, config, outputs, store, credentials, `rehearsal-${Date.now()}`)
  const restored = await readBackup(store, credentials, backup.key)
  // Exercise the actual encrypted export on a clean, isolated SQLite database.
  // The D1 Time Travel rehearsal is separately required below.
  const db = new DatabaseSync(':memory:')
  let integrity, tables
  try {
    db.exec(restored.sql)
    integrity = db.prepare('PRAGMA integrity_check').get().integrity_check
    tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name)
  } finally { db.close() }
  if (integrity !== 'ok' || !['recipes', 'articles', 'owners'].every((table) => tables.includes(table))) throw new Error('Export restore integrity check failed')
  const timeTravel = (await store.read(`rehearsals/${revision}.json`))?.value
  if (!timeTravel?.timeTravelVerified) throw new Error('Encrypted export restore passed. Run remote:rehearse to verify actual staging D1 Time Travel before acceptance.')
  if (!ownerReviewed) throw new Error('Automated checks passed. Complete owner MFA/admin/preview review, then rerun with --owner-reviewed to attest that review.')
  const report = { revision, releaseId: control.releaseId, checkedAt: new Date().toISOString(), restoreVerified: true,
    accessVerified: true, performanceVerified: true, ownerReviewed: true, backup: backup.key }
  await stateStore.write(`acceptance/staging/${revision}.json`, report)
  mkdirSync('dist', { recursive: true })
  writeFileSync(resolve('dist/remote-acceptance.json'), JSON.stringify(report, null, 2))
  console.log('Staging acceptance recorded for this exact commit.')
}
