import application from './.open-next/worker.js'
import { remoteRequest } from './src/next/remote-policy.mjs'

export default {
  fetch(request, env, context) {
    return remoteRequest(request, env, (checked) => {
      const path = new URL(checked.url).pathname
      if (env.ASSETS && (path.startsWith('/_next/static/') || path.startsWith('/fonts/') || path === '/donut-icon.svg')) return env.ASSETS.fetch(checked)
      return application.fetch(checked, env, context)
    })
  },
}
export * from './.open-next/worker.js'
