import type { ListArticlesRequest } from '@eat-yeet/l3-api-contract/articles'
import type { ListRecipesRequest } from '@eat-yeet/l3-api-contract/recipes'

export const queryKeys = {
  articles: {
    all: ['articles'] as const,
    lists: () => [...queryKeys.articles.all, 'list'] as const,
    list: (request: ListArticlesRequest = {}) =>
      [...queryKeys.articles.lists(), request] as const,
    latest: (count: number) => [...queryKeys.articles.lists(), 'latest', count] as const,
    details: () => [...queryKeys.articles.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.articles.details(), slug] as const,
  },
  recipes: {
    all: ['recipes'] as const,
    lists: () => [...queryKeys.recipes.all, 'list'] as const,
    list: (request: ListRecipesRequest = {}) =>
      [...queryKeys.recipes.lists(), request] as const,
    latest: (count: number) => [...queryKeys.recipes.lists(), 'latest', count] as const,
    details: () => [...queryKeys.recipes.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.recipes.details(), slug] as const,
  },
}
