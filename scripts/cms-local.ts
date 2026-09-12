import { localEnvironment, localBindings, WEB } from './local-runtime.mjs'
import { resolve } from 'node:path'
import { getPayload } from 'payload'
import { createCMSConfig } from '@eat-yeet/l4-content-cms/config'
export async function openLocalCMS(setup = false) {
  Object.assign(process.env, localEnvironment({ create: setup }))
  // CLI processes must not subscribe to a running Next server's HMR socket.
  // Payload's destroy() does not close that subscription, preventing CLI exit.
  process.env.DISABLE_PAYLOAD_HMR = 'true'
  const proxy = await localBindings()
  const config = createCMSConfig(proxy.env as any, {
    secret: process.env.PAYLOAD_SECRET!,
    origin: process.env.LOCAL_ORIGIN!,
    migrationDir: resolve(WEB, 'migrations'),
    push: false,
  })
  const payload = await getPayload({ config })
  return {
    payload,
    bucket: proxy.env.R2 as any,
    close: async () => {
      await payload.destroy()
      await proxy.dispose()
    },
  }
}
