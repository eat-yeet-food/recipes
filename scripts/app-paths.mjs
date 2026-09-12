import { fileURLToPath } from 'node:url'
import { isAbsolute, relative, resolve } from 'node:path'
import { APP_ID, APP_PATHS } from '#site-config'

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
const appRoot = resolve(ROOT, 'apps', APP_ID)
export const RESOLVED_APP_PATHS = Object.fromEntries(Object.entries(APP_PATHS).map(([key, path]) => {
  const absolute = resolve(ROOT, path)
  const rel = relative(appRoot, absolute)
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error(`${APP_ID}: ${key} must belong to its app directory`)
  return [key, absolute]
}))
