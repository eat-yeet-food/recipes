import { createRecipeApiAccess } from '@eat-yeet/l3-api-query/recipes'
import { recipeStubSeeds, recipeStubService } from '@app/recipes'

export const recipeClient = recipeStubService
export const recipeApi = createRecipeApiAccess(recipeClient, recipeStubSeeds)
export const recipeQueries = recipeApi.queries
