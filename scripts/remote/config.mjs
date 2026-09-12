import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function environmentName(value) {
  if (!['staging', 'production', 'bootstrap'].includes(value)) throw new Error('Explicit --env staging|production|bootstrap is required')
  return value
}
export function loadRemoteConfig(environment) {
  environmentName(environment)
  const path = resolve('infra/cloudflare', `${environment}.json`)
  let config
  try { config = JSON.parse(readFileSync(path, 'utf8')) }
  catch { throw new Error(`Missing verified inventory configuration: ${path}. Run remote:inventory before filling it.`) }
  for (const name of ['accountId', 'zoneId', 'stateBucket', 'ownerEmail', 'accessTeamDomain'])
    if (!config[name] || /placeholder|replace|example/i.test(config[name])) throw new Error(`Verified ${name} is required`)
  if (!/^[a-f0-9]{32}$/.test(config.accountId) || !/^[a-f0-9]{32}$/.test(config.zoneId)) throw new Error('Invalid Cloudflare identifiers')
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.accessTeamDomain)) throw new Error('Invalid Access team domain')
  const origin = environment === 'production' ? 'https://eatyeet.com' : 'https://staging.eatyeet.com'
  if (!config.cloudflareIdpId && environment !== 'bootstrap') {
    try { config.cloudflareIdpId = JSON.parse(readFileSync('.local/remote/bootstrap/outputs.json', 'utf8')).cloudflareIdpId } catch { /* Bootstrap emits the verified provider identity. */ }
  }
  return { ...config, environment, origin, mediaOrigin: environment === 'production' ? 'https://media.eatyeet.com' : origin }
}
export function proxyConfig(config, outputs) {
  if (!outputs.databaseId || !outputs.mediaBucket || !outputs.operationsBucket) throw new Error('Provision infrastructure before using remote content commands')
  const directory = resolve('.local/remote', config.environment)
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const path = resolve(directory, 'wrangler.json')
  writeFileSync(path, JSON.stringify({
    name: `eatyeet-${config.environment}-cli`, account_id: config.accountId,
    compatibility_date: '2026-09-12', compatibility_flags: ['nodejs_compat'],
    workers_dev: false, preview_urls: false,
    d1_databases: [{ binding: 'D1', database_id: outputs.databaseId, database_name: outputs.databaseName, remote: true }],
    r2_buckets: [{ binding: 'R2', bucket_name: outputs.mediaBucket, remote: true }, { binding: 'OPERATIONS', bucket_name: outputs.operationsBucket, remote: true }],
  }, null, 2), { mode: 0o600 })
  return path
}
