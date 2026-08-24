import { APP_PATHS } from '../../../../../site.config.mjs'
import { ROOT, resolveAppPaths } from '@eat-yeet/l4-content-build/app-paths'

export { ROOT }
export const RESOLVED_APP_PATHS = resolveAppPaths(APP_PATHS)
