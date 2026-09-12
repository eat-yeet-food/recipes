import { parseArgs } from 'node:util'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { environmentName, loadRemoteConfig } from './remote/config.mjs'
import { credentialsCommand, keychain } from './remote/credentials.mjs'
import { cloudflareAPI, inventory } from './remote/cloudflare.mjs'
import { r2Client, ObjectStore } from './remote/storage.mjs'
import { infrastructure, saveOutputs, readOutputs } from './remote/pulumi.mjs'
import { ReleaseLock, recoverLocalLock } from './remote/lock.mjs'
import { runRelease } from './remote/release.mjs'
import { command } from './remote/process.mjs'
import { databaseBackup, readBackup } from './remote/backups.mjs'
import { acceptStaging, rehearseRestore } from './remote/acceptance.mjs'

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  env: { type: 'string' }, resume: { type: 'string' }, rollback: { type: 'string' },
  backup: { type: 'string' }, bookmark: { type: 'string' }, 'owner-reviewed': { type: 'boolean' }, 'writer-stopped': { type: 'boolean' },
} })
const [action, operation, file] = positionals
const validCommands = { credentials: ['enroll', 'export', 'import'], inventory: [undefined], bootstrap: [undefined], status: [undefined],
  deploy: [undefined], infra: ['preview', 'up'], content: ['plan', 'sync', 'migrate', 'owner', 'recover'],
  backup: [undefined], restore: [undefined], acceptance: [undefined], rehearse: [undefined] }
if (action !== 'recover-lock' && !validCommands[action]?.includes(operation)) throw new Error('Unknown remote command; see docs/payload-remote.md')
const environment = environmentName(values.env)
if (action === 'credentials') {
  await credentialsCommand(environment, operation, file)
} else {
  const credentials = keychain('get', environment)
  const api = cloudflareAPI(credentials.CLOUDFLARE_API_TOKEN)
  const directory = resolve('.local/remote', environment)
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  if (action === 'inventory') {
    const result = await inventory(api)
    writeFileSync(resolve(directory, 'inventory.json'), JSON.stringify(result, null, 2), { mode: 0o600 })
    console.log(`Verified zone eatyeet.com in account ${result.accountName}; inventory saved to ${directory}/inventory.json`)
  } else {
    const config = loadRemoteConfig(environment)
    const client = r2Client(config.accountId, credentials)
    const stateStore = new ObjectStore(client, config.stateBucket)
    try {
      if (action === 'bootstrap') {
        if (environment !== 'bootstrap') throw new Error('State bootstrap requires --env bootstrap')
        if (!credentials.RECOVERY_EXPORTED_AT) throw new Error('Export an encrypted recovery kit before bootstrap')
        const current = await inventory(api)
        if (current.accountId !== config.accountId || current.zoneId !== config.zoneId) throw new Error('Inventory does not match the configured account/zone')
        if (!current.buckets.some((bucket) => bucket.name === config.stateBucket)) await api(`/accounts/${config.accountId}/r2/buckets`, { method: 'POST', body: JSON.stringify({ name: config.stateBucket }) })
        config.imports = { ...config.imports, 'pulumi-state': `${config.accountId}/${config.stateBucket}/default` }
        const lock = new ReleaseLock(stateStore, environment)
        await lock.acquire(`bootstrap-${Date.now()}`)
        lock.startHeartbeat(() => {})
        try {
          const stack = await infrastructure(config, credentials)
          await stateStore.write(`backups/bootstrap/${Date.now()}.json`, await stack.exportStack(), { IfNoneMatch: '*' })
          await stack.preview({ onOutput: console.log })
          await lock.assertOwner()
          await stack.up({ onOutput: console.log })
          await saveOutputs(stack, environment)
          await lock.release()
        } catch (error) { await lock.stop(); throw error }
      } else if (action === 'status') {
        const lock = await stateStore.read(`locks/${environment}.json`)
        const outputs = readOutputs(environment)
        const control = await new ObjectStore(client, outputs.operationsBucket).read('control.json')
        console.log(JSON.stringify({ lock: lock ? { ...lock.value, token: '[redacted]' } : null, control: control?.value }, null, 2))
      } else if (action === 'recover-lock') {
        await recoverLocalLock(stateStore, environment, operation, values['writer-stopped'])
        console.log('Interrupted lock recovered. Maintenance state was preserved; resume the original release.')
      } else if (action === 'deploy') {
        await runRelease({ config, credentials, stateStore, client, api, outputs: readOutputs(environment) }, { resume: values.resume, rollback: values.rollback })
      } else if (action === 'infra' && operation === 'preview') {
        const stack = await infrastructure(config, credentials)
        await stack.preview({ onOutput: console.log })
      } else if (action === 'content' && operation === 'plan') {
        await command('pnpm', ['exec', 'tsx', 'scripts/content-cli.ts', 'plan', '--env', environment], { env: { EATYEET_REMOTE_CHILD: environment } })
      } else if (action === 'content' && ['sync', 'migrate'].includes(operation)) {
        // Public content and schema changes always use the full release/recovery path.
        await runRelease({ config, credentials, stateStore, client, api, outputs: readOutputs(environment) })
      } else {
        const releaseId = `${action}-${Date.now()}`
        const lock = new ReleaseLock(stateStore, environment)
        const abort = new AbortController()
        await lock.acquire(releaseId)
        lock.startHeartbeat((error) => abort.abort(error))
        try {
          if (action === 'infra' && operation === 'up') {
            const observed = await inventory(api)
            if (observed.accountId !== config.accountId || observed.zoneId !== config.zoneId) throw new Error('Cloudflare inventory mismatch')
            const stack = await infrastructure(config, credentials)
            const state = await stack.exportStack()
            if (state.deployment?.resources?.length > 1) throw new Error('Infrastructure already exists. Apply changes through a release to preserve maintenance and backup ordering.')
            await stateStore.write(`backups/${environment}/${releaseId}.json`, state, { IfNoneMatch: '*' })
            await stack.preview({ onOutput: console.log })
            await lock.assertOwner()
            await stack.up({ onOutput: console.log })
            await saveOutputs(stack, environment)
          } else if (action === 'content' && ['owner', 'recover'].includes(operation)) {
            await command('pnpm', ['exec', 'tsx', 'scripts/content-cli.ts', operation, '--env', environment], {
              env: { EATYEET_REMOTE_CHILD: environment, EATYEET_RELEASE_LOCK: lock.value.token }, signal: abort.signal,
            })
          } else if (action === 'backup') {
            const outputs = readOutputs(environment)
            const result = await databaseBackup(api, config, outputs, new ObjectStore(client, outputs.operationsBucket), credentials, releaseId)
            console.log(JSON.stringify(result))
          } else if (action === 'acceptance' || action === 'rehearse') {
            const context = { config, credentials, client, api, outputs: readOutputs(environment), lock, stateStore }
            if (action === 'acceptance') await acceptStaging(context, values['owner-reviewed'])
            else await rehearseRestore(context)
          } else if (action === 'restore') {
            const outputs = readOutputs(environment)
            const store = new ObjectStore(client, outputs.operationsBucket)
            const backup = await readBackup(store, credentials, values.backup)
            if (backup.environment !== environment || backup.databaseId !== outputs.databaseId) throw new Error('Backup environment/database differs')
            const control = await store.read('control.json')
            if (control?.value.status !== 'maintenance') throw new Error('Restore requires an existing maintenance window; use the documented recovery procedure')
            if (values.bookmark !== backup.bookmark.bookmark) throw new Error('Pass the exact recorded --bookmark to authorize this database restore')
            await databaseBackup(api, config, outputs, store, credentials, releaseId)
            await lock.assertOwner()
            await api(`/accounts/${config.accountId}/d1/database/${outputs.databaseId}/time_travel/restore`, { method: 'POST', body: JSON.stringify({ bookmark: values.bookmark }) })
            await store.write('control.json', { ...control.value, generation: `restored-${Date.now()}`, status: 'maintenance' })
            console.log('Database restored. Maintenance remains active; recover owner sessions and resume a compatible release before reopening.')
          } else throw new Error('Unknown remote command; see docs/payload-remote.md')
          await lock.release()
        } catch (error) {
          await lock.stop()
          throw new Error(`${error.message}. Remote lock retained as ${releaseId}; inspect status before recovery.`)
        }
      }
    } finally { client.destroy() }
  }
}
