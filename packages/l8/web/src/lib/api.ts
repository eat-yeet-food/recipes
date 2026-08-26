import { createArticleApiAccess } from '@eat-yeet/l3-api-query/articles'
import { createRecipeApiAccess } from '@eat-yeet/l3-api-query/recipes'
import { articleStubSeeds, articleStubService } from '@app/articles'
import { recipeStubSeeds, recipeStubService } from '@app/recipes'

export const articleClient = articleStubService
export const articleApi = createArticleApiAccess(articleClient, articleStubSeeds)
export const articleQueries = articleApi.queries
export const recipeClient = recipeStubService
export const recipeApi = createRecipeApiAccess(recipeClient, recipeStubSeeds)
export const recipeQueries = recipeApi.queries
