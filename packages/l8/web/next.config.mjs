import { withPayload } from '@payloadcms/next/withPayload'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ACTIVE_APP } from '../../../site.config.mjs'
const root = fileURLToPath(new URL('../../../', import.meta.url))
await initOpenNextCloudflareForDev({
  configPath: resolve(root, 'packages/l8/web/wrangler.jsonc'),
  persist: {
    path: resolve(
      process.env.LOCAL_STATE_DIR || resolve(root, '.local'),
      'wrangler',
      'v3',
    ),
  },
  remoteBindings: false,
})
export default withPayload({
  agentRules: false,
  htmlLimitedBots: /.*/,
  output: 'standalone',
  outputFileTracingRoot: root,
  typescript: { tsconfigPath: 'tsconfig.next.json' },
  experimental: { cpus: 2 },
  serverExternalPackages: ['sharp'],
  webpack(config) {
    config.resolve.alias['@app/page-blocks'] = resolve(
      root,
      'apps',
      ACTIVE_APP.id,
      'src/page-blocks.ts',
    )
    config.resolve.alias['@app/recipe-workbenches'] = resolve(
      root,
      'apps',
      ACTIVE_APP.id,
      'src/recipe-workbenches.ts',
    )
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
})
