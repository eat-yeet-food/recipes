import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

function suppressModuleDirectiveWarning(warning: { code?: string }): boolean {
  return warning.code === 'MODULE_LEVEL_DIRECTIVE'
}

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
        if (suppressModuleDirectiveWarning(warning)) return
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
  preview: { host: '127.0.0.1' },
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
          const original = rollupConfig.onwarn
          rollupConfig.onwarn = (warning, handler) => {
            if (suppressModuleDirectiveWarning(warning)) return
            if (typeof original === 'function') original(warning, handler)
            else handler(warning)
          }
        },
      },
    }),
  ],
})
