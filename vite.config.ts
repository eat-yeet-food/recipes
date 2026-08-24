import { fileURLToPath, URL } from 'node:url'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'

import { ACTIVE_APP, APP_ID, APP_PATHS } from '#site-config'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const WEB_SRC = fileURLToPath(new URL('./packages/l8/web/src', import.meta.url))
const ACTIVE_RECIPE_MODULE = fileURLToPath(new URL(`./apps/${APP_ID}/src/recipes.stub.ts`, import.meta.url))
const ACTIVE_PAGE_BLOCKS_MODULE = fileURLToPath(new URL(`./apps/${APP_ID}/src/page-blocks.ts`, import.meta.url))
const PUBLIC_APP_CONFIG = {
  id: ACTIVE_APP.id,
  siteName: ACTIVE_APP.siteName,
  siteUrl: ACTIVE_APP.siteUrl,
  defaultOgImage: ACTIVE_APP.defaultOgImage,
  copy: ACTIVE_APP.copy,
  categories: ACTIVE_APP.categories,
}

function suppressModuleDirectiveWarning(warning: { code?: string }): boolean {
  return warning.code === 'MODULE_LEVEL_DIRECTIVE'
}

/**
 * Suppress "use client" directive warnings from RSC-aware libraries. These are
 * valid React conventions that Rollup doesn't understand. `enforce: 'post'`
 * so this wraps anything Nitro or
 * TanStack Start set rather than being overridden by them.
 */
function suppressModuleDirectiveWarnings(): import('vite').Plugin {
  return {
    name: 'suppress-module-directive-warnings',
    enforce: 'post',
    configResolved(config) {
      const previousWarn = config.build.rollupOptions?.onwarn
      config.build.rollupOptions ??= {}
      config.build.rollupOptions.onwarn = (warning, handler) => {
        if (suppressModuleDirectiveWarning(warning)) return
        if (typeof previousWarn === 'function') previousWarn(warning, handler)
        else handler(warning)
      }
    },
  }
}

/**
 * Every page is prerendered at build time and Cloudflare Pages serves the
 * result as static files — there is no server at runtime. `crawlLinks` would
 * find most of these anyway, but the list is explicit so a broken link cannot
 * silently drop a recipe out of the build.
 */
export default defineConfig({
  preview: { host: '127.0.0.1' },
  define: {
    __APP_ID__: JSON.stringify(APP_ID),
    __APP_CONFIG__: JSON.stringify(PUBLIC_APP_CONFIG),
  },
  publicDir: join(ROOT, APP_PATHS.publicDir),
  // Assets live under /build, not Vite's default /assets. This keeps the
  // current asset namespace isolated from stale edge-cache entries while
  // preserving content-hashed cross-deploy caching.
  build: { sourcemap: false, assetsDir: 'build' },
  // Vite owns runtime aliases that depend on APP_ID. TypeScript sees their
  // public shapes through packages/l8/web/src/app-modules.d.ts.
  resolve: {
    alias: [
      { find: '@app/recipes', replacement: ACTIVE_RECIPE_MODULE },
      { find: '@app/page-blocks', replacement: ACTIVE_PAGE_BLOCKS_MODULE },
      { find: '@', replacement: WEB_SRC },
    ],
  },
  plugins: [
    suppressModuleDirectiveWarnings(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'packages/l8/web/src',
      // Prerendering is done by scripts/prerender.mjs after the server bundle is
      // built. TanStack's internal Vite preview readiness probe is unreliable
      // in restricted loopback environments, while the explicit script keeps the
      // same path list and writes plain static HTML.
      prerender: { enabled: false },
    }),
    viteReact(),
    nitro({
      hooks: {
        'rollup:before'(_nitro, rollupConfig) {
          const previousWarn = rollupConfig.onwarn
          rollupConfig.onwarn = (warning, handler) => {
            if (suppressModuleDirectiveWarning(warning)) return
            if (typeof previousWarn === 'function') previousWarn(warning, handler)
            else handler(warning)
          }
        },
      },
    }),
  ],
})
