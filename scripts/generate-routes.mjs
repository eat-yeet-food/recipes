/**
 * Generate TanStack Router's route tree without running a Vite build.
 *
 * Vite does this through the TanStack Start plugin, but the standalone
 * `pnpm run typecheck` path calls `tsc` directly. Fresh clones do not have the
 * ignored `packages/l8/web/src/routeTree.gen.ts`, so typechecking has to create
 * it first.
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Generator, getConfig } from '@tanstack/router-generator'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const routeTreeFileFooter = [
  `import type { getRouter } from './router.tsx'
import type { createStart } from '@tanstack/react-start'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
  }
}`,
]

const config = getConfig(
  {
    target: 'react',
    routesDirectory: join(ROOT, 'packages', 'l8', 'web', 'src', 'routes'),
    generatedRouteTree: join(ROOT, 'packages', 'l8', 'web', 'src', 'routeTree.gen.ts'),
    routeTreeFileFooter,
  },
  ROOT,
)

const generator = new Generator({ config, root: ROOT })
await generator.run()

console.log('routes: packages/l8/web/src/routeTree.gen.ts')
