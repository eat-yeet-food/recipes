/** Build-only app selection shared by Vite and Storybook. Never import from runtime source. */
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

export function appBuildConfig(app, root = fileURLToPath(new URL('../', import.meta.url))) {
  const publicConfig = {
    id: app.id,
    siteName: app.siteName,
    siteUrl: app.siteUrl,
    defaultOgImage: app.defaultOgImage,
    analytics: app.analytics ? { googleTagId: app.analytics.googleTagId } : undefined,
    copy: app.copy,
    categories: app.categories,
  }
  const modules = { articles: 'articles.stub.ts', recipes: 'recipes.stub.ts', 'page-blocks': 'page-blocks.ts', 'recipe-workbenches': 'recipe-workbenches.ts' }
  return {
    define: { __APP_ID__: JSON.stringify(app.id), __APP_CONFIG__: JSON.stringify(publicConfig) },
    alias: [
      ...Object.entries(modules).map(([name, file]) => ({ find: `@app/${name}`, replacement: join(root, 'apps', app.id, 'src', file) })),
      { find: '@', replacement: join(root, 'packages/l8/web/src') },
    ],
  }
}
