import { getPayload } from 'payload'
import { getPlatformProxy } from 'wrangler'
import { resolve } from 'node:path'
import { createCMSConfig } from '@eat-yeet/l4-content-cms/config'
import { loadRemoteConfig, proxyConfig } from './remote/config.mjs'
import { readOutputs } from './remote/pulumi.mjs'
import { keychain } from './remote/credentials.mjs'
import { ObjectStore, r2Client } from './remote/storage.mjs'

export async function openRemoteCMS(environment: string, mutation: boolean) {
  const config = loadRemoteConfig(environment)
  const credentials = keychain('get', environment)
  const outputs = readOutputs(environment)
  const locks = new ObjectStore(r2Client(config.accountId, credentials), config.stateBucket)
  const assertLock = async () => {
    if (!mutation) return
    const lock = await locks.read(`locks/${environment}.json`)
    if (!lock || lock.value.token !== process.env.EATYEET_RELEASE_LOCK) throw new Error('Remote mutations require the release lock')
  }
  await assertLock()
  Object.assign(process.env, { CLOUDFLARE_API_TOKEN: credentials.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: config.accountId,
    PAYLOAD_SECRET: credentials.PAYLOAD_SECRET, OWNER_EMAIL: config.ownerEmail, DISABLE_PAYLOAD_HMR: 'true' })
  const proxy = await getPlatformProxy<any>({ configPath: proxyConfig(config, outputs), remoteBindings: true })
  const payload = await getPayload({ config: createCMSConfig(proxy.env, {
    secret: credentials.PAYLOAD_SECRET, origin: config.origin, migrationDir: resolve('packages/l8/web/migrations'), push: false,
  }) })
  for (const name of ['create', 'update', 'updateGlobal', 'delete'] as const) {
    const original = (payload[name] as any).bind(payload)
    ;(payload as any)[name] = async (...args: any[]) => { await assertLock(); return original(...args) }
  }
  const bucket = proxy.env.R2
  const guardedBucket = { head: bucket.head.bind(bucket), get: bucket.get.bind(bucket),
    put: async (...args: any[]) => { await assertLock(); return bucket.put(...args) } }
  return { payload, bucket: guardedBucket, close: async () => { await payload.destroy(); await proxy.dispose(); locks.client.destroy() } }
}
