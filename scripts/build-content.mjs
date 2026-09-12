import { APP_ID } from '#site-config'
import { buildContent } from '@eat-yeet/l4-content-build/build-content'
import { loadArticles, loadRecipes } from '@eat-yeet/l4-content-build/parse'
import { RESOLVED_APP_PATHS } from './app-paths.mjs'

const { fixtures, articleFixtures, imagesDir, generatedDir } = RESOLVED_APP_PATHS
buildContent({
  appId: APP_ID,
  recipes: loadRecipes(fixtures),
  articles: articleFixtures ? loadArticles(articleFixtures) : [],
  imagesDir,
  generatedDir,
})
