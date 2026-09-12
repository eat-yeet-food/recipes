import { seal, unseal } from './credentials.mjs'
import { digest } from './process.mjs'

export async function databaseBackup(api, config, outputs, store, credentials, releaseId) {
  const endpoint = `/accounts/${config.accountId}/d1/database/${outputs.databaseId}`
  const bookmark = (await api(`${endpoint}/time_travel/bookmark`)).result
  let current
  for (let attempt = 0; attempt < 120; attempt++) {
    const result = (await api(`${endpoint}/export`, { method: 'POST', body: JSON.stringify({ output_format: 'polling', ...(current ? { current_bookmark: current } : {}) }) })).result
    if (result.error) throw new Error('D1 export failed')
    if (result.result?.signed_url) {
      const response = await fetch(result.result.signed_url, { signal: AbortSignal.timeout(120000) })
      if (!response.ok) throw new Error('D1 export download failed')
      const sql = await response.text()
      const payload = { version: 1, environment: config.environment, databaseId: outputs.databaseId,
        releaseId, bookmark, sha256: digest(sql), sql, createdAt: new Date().toISOString() }
      const key = `backups/${releaseId}/database.json`
      await store.write(key, seal(payload, credentials.PULUMI_CONFIG_PASSPHRASE), { IfNoneMatch: '*' })
      return { key, bookmark, sha256: payload.sha256 }
    }
    current = result.at_bookmark
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('D1 export timed out')
}
export async function readBackup(store, credentials, key) {
  if (!/^backups\/[a-zA-Z0-9_-]+\/database\.json$/.test(key)) throw new Error('Invalid backup key')
  const object = await store.read(key)
  if (!object) throw new Error('Backup not found')
  const backup = unseal(object.value, credentials.PULUMI_CONFIG_PASSPHRASE)
  if (digest(backup.sql) !== backup.sha256) throw new Error('Backup checksum mismatch')
  return backup
}
