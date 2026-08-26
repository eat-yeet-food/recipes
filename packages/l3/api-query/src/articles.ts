import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import type {
  ArticleIndex,
  ArticleService,
  ListArticlesRequest,
  ListArticlesResponse,
} from '@eat-yeet/l3-api-contract/articles'
import { queryKeys } from './query-keys'

export interface ArticleQuerySeeds {
  articles?: ArticleIndex
}

function seededList(request: ListArticlesRequest = {}, seeds: ArticleQuerySeeds): ListArticlesResponse | undefined {
  if (!seeds.articles) return undefined
  const limit = request.limit && request.limit > 0 ? request.limit : undefined
  return { articles: limit ? seeds.articles.slice(0, limit) : seeds.articles }
}

export function createArticleQueries<ArticleBody>(
  client: ArticleService<ArticleBody>,
  seeds: ArticleQuerySeeds = {},
) {
  return {
    list: (request: ListArticlesRequest = {}) =>
      queryOptions({
        queryKey: queryKeys.articles.list(request),
        queryFn: () => client.listArticles(request),
        initialData: seededList(request, seeds),
        placeholderData: keepPreviousData,
      }),
    latest: (count: number) =>
      queryOptions({
        queryKey: queryKeys.articles.latest(count),
        queryFn: async (): Promise<ListArticlesResponse> => {
          const response = await client.listArticles({ limit: count })
          return { articles: response.articles.slice(0, count) }
        },
        initialData: seededList({ limit: count }, seeds),
      }),
    detail: (slug: string) =>
      queryOptions({
        queryKey: queryKeys.articles.detail(slug),
        queryFn: () => client.getArticle({ slug }),
        enabled: slug.length > 0,
      }),
  }
}

export function createArticleApiAccess<ArticleBody>(
  client: ArticleService<ArticleBody>,
  seeds: ArticleQuerySeeds = {},
) {
  const queries = createArticleQueries(client, seeds)

  return {
    queries,
    useList: (request: ListArticlesRequest = {}) => useQuery(queries.list(request)),
    useLatest: (count: number) => useQuery(queries.latest(count)),
    useDetail: (slug: string) => useQuery(queries.detail(slug)),
  }
}
