/** Static article helpers. App-specific data is supplied by app modules. */

import type { ArticleIndex, ArticleService, GetArticleRequest, ListArticlesRequest } from '@eat-yeet/l3-api-contract/articles'
export { articleImageUrl, type ArticleSummary } from '@eat-yeet/l1-article-model/articles'

export function listStaticArticles(index: ArticleIndex, request: ListArticlesRequest = {}) {
  const limit = request.limit && request.limit > 0 ? request.limit : undefined
  return limit ? index.slice(0, limit) : index
}

export const findStaticArticle = (index: ArticleIndex, slug: string) => index.find((article) => article.slug === slug)

type GeneratedBodyModules<ArticleBody> = Record<string, () => Promise<{ default: ArticleBody }>>

async function getGeneratedArticle<ArticleBody>(
  bodies: GeneratedBodyModules<ArticleBody>,
  articleDir: string,
  { slug }: GetArticleRequest,
): Promise<ArticleBody | null> {
  const load = bodies[`${articleDir}/${slug}.json`]
  if (!load) return null
  return (await load()).default
}

export function createGeneratedArticleService<ArticleBody>(
  index: ArticleIndex,
  bodies: GeneratedBodyModules<ArticleBody>,
  articleDir: string,
): ArticleService<ArticleBody> {
  return {
    async listArticles(request: ListArticlesRequest = {}) {
      return { articles: listStaticArticles(index, request) }
    },
    async getArticle(request) {
      return { article: await getGeneratedArticle(bodies, articleDir, request) }
    },
  }
}

export function createGeneratedArticleSeeds(index: ArticleIndex) {
  return { articles: index }
}
