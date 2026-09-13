import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { keychain, hiddenInput, r2CredentialsFromToken, seal } from './credentials.mjs'
import { cloudflareAPI, inventory } from './cloudflare.mjs'
import { environmentName, loadRemoteConfig } from './config.mjs'

const environments = ['bootstrap', 'staging', 'production']
const secretNames = ['PULUMI_CONFIG_PASSPHRASE', 'PAYLOAD_SECRET', 'RELEASE_VERIFY_SECRET']
const operatorNames = ['CLOUDFLARE_API_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']

function validateOperator(operator, config) {
  if (operator.version !== 1 || operatorNames.some((name) => typeof operator[name] !== 'string' || !operator[name])) throw new Error('Operator credentials are incomplete; restore the recovery kit')
  if (operator.accountId !== config.accountId || operator.zoneId !== config.zoneId) throw new Error('Operator credential belongs to another account or zone')
}

export function environmentSecrets(existing) {
  if (existing) {
    if (secretNames.some((name) => typeof existing[name] !== 'string' || existing[name].length < 16)) throw new Error('Existing environment credentials are incomplete; restore them instead of generating replacements')
    return { ...existing }
  }
  return Object.fromEntries(secretNames.map((name) => [name, randomBytes(48).toString('base64url')]))
}

export function deploymentCredentials(environment, read = keychain, config) {
  environmentName(environment)
  const local = read('get', environment)
  const operator = read('get-optional', 'operator')
  // Preserve compatibility with already-enrolled release/recovery environments.
  if (!operator) return local
  validateOperator(operator, config ?? loadRemoteConfig(environment))
  if (!operator.RECOVERY_EXPORTED_AT || local.RECOVERY_EXPORTED_AT !== operator.RECOVERY_EXPORTED_AT) throw new Error('Finish pnpm remote:setup to export the operator recovery kit')
  if (secretNames.some((name) => !local[name])) throw new Error('Restore the missing environment secrets before deployment')
  return { ...local, CLOUDFLARE_API_TOKEN: operator.CLOUDFLARE_API_TOKEN,
    R2_ACCESS_KEY_ID: operator.R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY: operator.R2_SECRET_ACCESS_KEY }
}

export async function setupOperator({ from, read = keychain, prompt = hiddenInput, inspect = inventory, derive = r2CredentialsFromToken, config = loadRemoteConfig('bootstrap') } = {}) {
  if (from && !environments.includes(from)) throw new Error('--from must be bootstrap, staging or production')
  let operator = read('get-optional', 'operator')
  if (!operator) {
    const token = from ? read('get', from).CLOUDFLARE_API_TOKEN : (await prompt('Cloudflare operator API token')).trim()
    if (!token) throw new Error('A Cloudflare API token is required')
    const observed = await inspect(cloudflareAPI(token))
    if (observed.accountId !== config.accountId || observed.zoneId !== config.zoneId) throw new Error('Operator inventory does not match the verified account and zone')
    operator = { version: 1, accountId: config.accountId, zoneId: config.zoneId,
      CLOUDFLARE_API_TOKEN: token, ...await derive(token) }
    read('create', 'operator', operator)
  }
  validateOperator(operator, config)
  const entries = {}
  for (const environment of environments) {
    const old = read('get-optional', environment)
    entries[environment] = environmentSecrets(old)
    if (!old) read('create', environment, entries[environment])
  }
  if (operator.RECOVERY_EXPORTED_AT && environments.every((environment) => entries[environment].RECOVERY_EXPORTED_AT === operator.RECOVERY_EXPORTED_AT)) {
    console.log('Operator credential and all environment recovery entries are already enrolled.')
    return
  }
  const password = await prompt('Recovery passphrase (9+ characters; one export covers all environments)')
  if (password !== await prompt('Repeat recovery passphrase')) throw new Error('Passphrases differ')
  const exportedAt = new Date().toISOString()
  const bundle = { kind: 'eatyeet-operator-recovery', version: 1,
    operator: { ...operator, RECOVERY_EXPORTED_AT: exportedAt },
    environments: Object.fromEntries(environments.map((environment) => [environment, { ...entries[environment], RECOVERY_EXPORTED_AT: exportedAt }])) }
  const directory = resolve('.local/remote/recovery')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const path = resolve(directory, `operator-${Date.now()}.json`)
  writeFileSync(path, JSON.stringify(seal(bundle, password)), { mode: 0o600, flag: 'wx' })
  // The encrypted file is durable before any entry is marked ready. Interrupted
  // setup preserves every generated secret and can repeat the export safely.
  for (const environment of environments) read('set', environment, bundle.environments[environment])
  read('set', 'operator', bundle.operator)
  console.log(`One encrypted recovery kit written: ${path}`)
}

export function restoreOperator(bundle, read = keychain, config = loadRemoteConfig('bootstrap')) {
  if (bundle?.kind !== 'eatyeet-operator-recovery' || bundle.version !== 1) throw new Error('Not an operator recovery kit')
  validateOperator(bundle.operator, config)
  if (!bundle.operator.RECOVERY_EXPORTED_AT) throw new Error('Recovery kit has no completed export record')
  for (const environment of environments) {
    const entry = bundle.environments?.[environment]
    if (!entry || entry.RECOVERY_EXPORTED_AT !== bundle.operator.RECOVERY_EXPORTED_AT) throw new Error('Recovery kit is missing an environment')
    environmentSecrets(entry)
  }
  for (const environment of environments) read('set', environment, bundle.environments[environment])
  read('set', 'operator', bundle.operator)
}
