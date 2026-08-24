import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import type {
  RecipeIndex,
  ListRecipesRequest,
  ListRecipesResponse,
  RecipeService,
} from '@eat-yeet/l3-api-contract/recipes'
import { queryKeys } from './query-keys'

export interface RecipeQuerySeeds {
  recipes?: RecipeIndex
}

function seededList(request: ListRecipesRequest = {}, seeds: RecipeQuerySeeds): ListRecipesResponse | undefined {
  if (!seeds.recipes) return undefined
  const limit = request.limit && request.limit > 0 ? request.limit : undefined
  return { recipes: limit ? seeds.recipes.slice(0, limit) : seeds.recipes }
}

export function createRecipeQueries<RecipeBody>(
  client: RecipeService<RecipeBody>,
  seeds: RecipeQuerySeeds = {},
) {
  return {
    list: (request: ListRecipesRequest = {}) =>
      queryOptions({
        queryKey: queryKeys.recipes.list(request),
        queryFn: () => client.listRecipes(request),
        initialData: seededList(request, seeds),
        placeholderData: keepPreviousData,
      }),
    latest: (count: number) =>
      queryOptions({
        queryKey: queryKeys.recipes.latest(count),
        queryFn: async (): Promise<ListRecipesResponse> => {
          const response = await client.listRecipes({ limit: count })
          return { recipes: response.recipes.slice(0, count) }
        },
        initialData: seededList({ limit: count }, seeds),
      }),
    detail: (slug: string) =>
      queryOptions({
        queryKey: queryKeys.recipes.detail(slug),
        queryFn: () => client.getRecipe({ slug }),
        enabled: slug.length > 0,
      }),
  }
}

export function createRecipeApiAccess<RecipeBody>(
  client: RecipeService<RecipeBody>,
  seeds: RecipeQuerySeeds = {},
) {
  const queries = createRecipeQueries(client, seeds)

  return {
    queries,
    useList: (request: ListRecipesRequest = {}) => useQuery(queries.list(request)),
    useLatest: (count: number) => useQuery(queries.latest(count)),
    useDetail: (slug: string) => useQuery(queries.detail(slug)),
  }
}
