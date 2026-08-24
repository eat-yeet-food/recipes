import type { ListRecipesRequest } from '@eat-yeet/l3-api-contract/recipes'

export const queryKeys = {
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
