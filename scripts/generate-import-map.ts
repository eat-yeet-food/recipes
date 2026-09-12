import { resolve } from 'node:path'
import { generateImportMap } from 'payload'
import { createCMSConfig } from '@eat-yeet/l4-content-cms/config'
import { WEB } from './local-runtime.mjs'

// Import maps depend only on the schema. Do not initialize Payload or open a
// database/storage connection just to discover its admin components.
const config = await createCMSConfig(
  {} as Parameters<typeof createCMSConfig>[0],
  {
    secret: 'import-map-generation-only-not-a-runtime-secret',
    origin: 'http://127.0.0.1:3000',
    migrationDir: resolve(WEB, 'migrations'),
    push: false,
  },
)
config.admin.importMap.importMapFile = resolve(
  WEB,
  'src/app/(payload)/admin/importMap.js',
)
await generateImportMap(config, { force: true, log: true })
