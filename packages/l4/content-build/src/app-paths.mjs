import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

export function fromRoot(path) {
  return join(ROOT, path)
}

export function resolveAppPaths(appPaths) {
  return Object.fromEntries(
    Object.entries(appPaths).map(([key, path]) => [key, fromRoot(path)]),
  )
}
