import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

import { ALL_PATHS } from './src/lib/paths'

/**
 * Suppress "use client" directive warnings from RSC-aware libraries. These are
 * valid React conventions that Rollup doesn't understand — the original app
 * carried the same plugin. `enforce: 'post'` so this wraps anything Nitro or
 * TanStack Start set rather than being overridden by them.
 */
function suppressModuleDirectiveWarnings(): import('vite').Plugin {
  return {
    name: 'suppress-module-directive-warnings',
    enforce: 'post',
    configResolved(config) {
      const original = config.build.rollupOptions?.onwarn
      config.build.rollupOptions ??= {}
      config.build.rollupOptions.onwarn = (warning, handler) => {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        if (typeof original === 'function') original(warning, handler)
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
  // Assets live under /build, not Vite's default /assets. A poisoned edge-cache
  // entry under the old path (see scripts/build-seo.mjs on the _headers merge
  // bug) outlived its deploy, and moving the directory retires every one of
  // them at once. Content hashing is unchanged, so cross-deploy caching still
  // works normally.
  build: { sourcemap: false, assetsDir: 'build' },
  plugins: [
    suppressModuleDirectiveWarnings(),
    tanstackStart({
      srcDirectory: 'src',
      // No crawling: it follows every browse link and prerenders a page per
      // facet permutation. /search is one interactive page whose filters live
      // in query params, so exactly one copy of it belongs in the build.
      prerender: { enabled: true, crawlLinks: false },
      pages: ALL_PATHS.map((path) => ({ path, prerender: { enabled: true } })),
    }),
    viteReact(),
    nitro(),
  ],
})
