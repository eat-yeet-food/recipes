import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig, type PluginOption } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const routerMock = fileURLToPath(new URL('../src/storybook/router-mock.tsx', import.meta.url))
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
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: ['../public'],
  viteFinal: async (config) =>
    mergeConfig(
      {
        ...config,
        plugins: withoutAppOnlyPlugins(config.plugins),
      },
      {
        resolve: {
          alias: [{ find: '@tanstack/react-router', replacement: routerMock }],
        },
      },
    ),
}

export default config
