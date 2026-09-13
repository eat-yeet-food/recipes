import application from './.open-next/worker.js'
import { remoteRequest, staticAsset } from './src/next/remote-policy.mjs'
import { publicWorkerMedia } from './src/next/worker-media.mjs'
import { publicHTML } from './src/next/html-cache.mjs'

export default {
  fetch(request, env, context) {
    return remoteRequest(request, env, async (checked, admission) => {
      const path = new URL(checked.url).pathname
      if (env.ASSETS && staticAsset(path)) return env.ASSETS.fetch(checked)
      const media = await publicWorkerMedia(checked, env, context, globalThis.caches?.default)
      if (media) return media
      return publicHTML(checked, env, context, globalThis.caches?.default, admission,
        (document) => application.fetch(document, env, context))
    })
  },
}
export * from './.open-next/worker.js'
