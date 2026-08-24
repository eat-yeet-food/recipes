import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { mergeConfig, type PluginOption } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { ACTIVE_APP, APP_ID, APP_PATHS } from '../../../../site.config.mjs'

const webSrc = fileURLToPath(new URL('../src', import.meta.url))
const routerMock = fileURLToPath(new URL('../src/storybook/router-mock.tsx', import.meta.url))
const activeRecipeModule = fileURLToPath(new URL(`../../../../apps/${APP_ID}/src/recipes.stub.ts`, import.meta.url))
const activePageBlocksModule = fileURLToPath(new URL(`../../../../apps/${APP_ID}/src/page-blocks.ts`, import.meta.url))
const appOnlyPluginPattern = /(tanstack|nitro|suppress-module-directive)/i
const publicAppConfig = {
  id: ACTIVE_APP.id,
  siteName: ACTIVE_APP.siteName,
  siteUrl: ACTIVE_APP.siteUrl,
  defaultOgImage: ACTIVE_APP.defaultOgImage,
  copy: ACTIVE_APP.copy,
  categories: ACTIVE_APP.categories,
}

function withoutAppOnlyPlugins(plugins: PluginOption[] = []): PluginOption[] {
  return plugins
    .flatMap((plugin) => (Array.isArray(plugin) ? withoutAppOnlyPlugins(plugin) : [plugin]))
    .filter((plugin) => {
      if (!plugin || typeof plugin === 'boolean') return false
      if (typeof plugin === 'function') return true
      return !appOnlyPluginPattern.test(plugin.name)
    })
}

const config: StorybookConfig = {
  stories: ['../../../**/src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: [`../../../../${APP_PATHS.publicDir}`],
  viteFinal: async (config) =>
    mergeConfig(
      {
        ...config,
        plugins: withoutAppOnlyPlugins(config.plugins),
      },
      {
        plugins: [tailwindcss()],
        define: {
          __APP_ID__: JSON.stringify(APP_ID),
          __APP_CONFIG__: JSON.stringify(publicAppConfig),
        },
        resolve: {
          alias: [
            { find: '@tanstack/react-router', replacement: routerMock },
            { find: '@app/recipes', replacement: activeRecipeModule },
            { find: '@app/page-blocks', replacement: activePageBlocksModule },
            { find: '@', replacement: webSrc },
          ],
        },
      },
    ),
}

export default config
