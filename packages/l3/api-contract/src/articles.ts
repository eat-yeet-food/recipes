import type { ArticleSummary } from '@eat-yeet/l1-article-model/articles'

export type ArticleIndex = ArticleSummary[]

export interface ListArticlesRequest {
  limit?: number
}

export interface GetArticleRequest {
  slug: string
}

export interface GetArticleResponse<ArticleBody = unknown> {
  article: ArticleBody | null
}

export interface ListArticlesResponse {
  articles: ArticleIndex
}

export interface ArticleService<ArticleBody = unknown> {
  listArticles(request?: ListArticlesRequest): Promise<ListArticlesResponse>
  getArticle(request: GetArticleRequest): Promise<GetArticleResponse<ArticleBody>>
}
