import { getGenerated, listGenerated, type GeneratedBodyModules } from './generated.ts'
/** Static article helpers. App-specific data is supplied by app modules. */

import type { ArticleIndex, ArticleService, ListArticlesRequest } from '@eat-yeet/l3-api-contract/articles'
export { articleImageUrl, type ArticleSummary } from '@eat-yeet/l1-article-model/articles'

export const listStaticArticles = (index: ArticleIndex, request: ListArticlesRequest = {}) => listGenerated(index, request)

export const findStaticArticle = (index: ArticleIndex, slug: string) => index.find((article) => article.slug === slug)

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
      return { article: await getGenerated(bodies, articleDir, request.slug) }
    },
  }
}

export function createGeneratedArticleSeeds(index: ArticleIndex) {
  return { articles: index }
}
