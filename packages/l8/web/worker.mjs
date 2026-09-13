import application from './.open-next/worker.js'
import { remoteRequest, staticAsset } from './src/next/remote-policy.mjs'
import { publicWorkerMedia } from './src/next/worker-media.mjs'

export default {
  fetch(request, env, context) {
    return remoteRequest(request, env, async (checked) => {
      const path = new URL(checked.url).pathname
      if (env.ASSETS && staticAsset(path)) return env.ASSETS.fetch(checked)
      const media = await publicWorkerMedia(checked, env, context, globalThis.caches?.default)
      if (media) return media
      return application.fetch(checked, env, context)
    })
  },
}
export * from './.open-next/worker.js'
