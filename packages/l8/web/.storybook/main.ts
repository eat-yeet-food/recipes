import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { mergeConfig, type PluginOption } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { ACTIVE_APP, APP_PATHS } from '../../../../site.config.mjs'
import { appBuildConfig } from '../../../../scripts/app-build-config.mjs'

const routerMock = fileURLToPath(new URL('../src/storybook/router-mock.tsx', import.meta.url))
const appBuild = appBuildConfig(ACTIVE_APP)
const appOnlyPluginPattern = /(tanstack|nitro|suppress-module-directive)/i

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
  stories: ['../../../**/src/**/*.stories.@(ts|tsx)', '../src/**/*.mdx'],
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
        define: appBuild.define,
        resolve: {
          alias: [
            { find: '@tanstack/react-router', replacement: routerMock },
            ...appBuild.alias,
          ],
        },
      },
    ),
}

export default config
