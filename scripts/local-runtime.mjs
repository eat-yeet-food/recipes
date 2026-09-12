import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const WEB = resolve(ROOT, 'packages/l8/web')
export const stateDir = resolve(ROOT, process.env.LOCAL_STATE_DIR || '.local')
export function localEnvironment({ create = false } = {}) {
  const path = resolve(stateDir, 'runtime.json')
  if (!existsSync(path)) {
    if (!create) throw new Error('Run pnpm local:setup first')
    mkdirSync(stateDir, { recursive: true, mode: 0o700 })
    writeFileSync(
      path,
      JSON.stringify({
        PAYLOAD_SECRET: randomBytes(48).toString('hex'),
        OWNER_EMAIL: '',
      }),
      { mode: 0o600 },
    )
  }
  const vars = JSON.parse(readFileSync(path, 'utf8'))
  const origin = process.env.LOCAL_ORIGIN || 'http://127.0.0.1:3000'
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
    throw new Error('Local commands require an explicit loopback HTTP origin')
  return {
    ...vars,
    LOCAL_ORIGIN: origin,
    SITE_URL: process.env.SITE_URL || 'https://eatyeet.com',
    SEO_AUDIT: process.env.SEO_AUDIT || '',
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    LOCAL_STATE_DIR: stateDir,
  }
}
export function updateOwner(email) {
  const vars = JSON.parse(
    readFileSync(resolve(stateDir, 'runtime.json'), 'utf8'),
  )
  vars.OWNER_EMAIL = email
  writeFileSync(resolve(stateDir, 'runtime.json'), JSON.stringify(vars), {
    mode: 0o600,
  })
}
export async function localBindings() {
  const { getPlatformProxy } = await import('wrangler')
  return getPlatformProxy({
    configPath: resolve(WEB, 'wrangler.jsonc'),
    persist: { path: resolve(stateDir, 'wrangler', 'v3') },
    remoteBindings: false,
  })
}
