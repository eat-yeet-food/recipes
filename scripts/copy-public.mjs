/**
 * Copy the active app's public assets into the final static output.
 *
 * Vite serves `publicDir` during dev, but Nitro owns `.output/public` in the
 * production build. Keep this explicit so each APP_ID ships its own assets.
 */

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { APP_ID, APP_PATHS } from '#site-config'
import { ROOT, RESOLVED_APP_PATHS } from './app-paths.mjs'

const source = RESOLVED_APP_PATHS.publicDir
const target = join(ROOT, '.output', 'public')

if (!existsSync(source)) {
  throw new Error(`Public directory for ${APP_ID} does not exist: ${APP_PATHS.publicDir}`)
}

mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })
console.log(`public(${APP_ID}): ${APP_PATHS.publicDir} -> .output/public`)
