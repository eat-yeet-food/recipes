import type { PublicAppConfig } from './lib/app-config-types'

declare global {
  const __APP_ID__: string
  const __APP_CONFIG__: PublicAppConfig
}

export {}
