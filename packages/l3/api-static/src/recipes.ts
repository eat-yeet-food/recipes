import { getGenerated, listGenerated, type GeneratedBodyModules } from './generated.ts'
/** Static recipe helpers. App-specific data is supplied by app modules. */

import type { ListRecipesRequest, RecipeIndex, RecipeService } from '@eat-yeet/l3-api-contract/recipes'
export { imageUrl, type RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

export const listStaticRecipes = (index: RecipeIndex, request: ListRecipesRequest = {}) => listGenerated(index, request)

export const findStaticRecipe = (index: RecipeIndex, slug: string) => index.find((recipe) => recipe.slug === slug)

export function createGeneratedRecipeService<RecipeBody>(
  index: RecipeIndex,
  bodies: GeneratedBodyModules<RecipeBody>,
  recipeDir: string,
): RecipeService<RecipeBody> {
  return {
    async listRecipes(request: ListRecipesRequest = {}) {
      return { recipes: listStaticRecipes(index, request) }
    },
    async getRecipe(request) {
      return { recipe: await getGenerated(bodies, recipeDir, request.slug) }
    },
  }
}

export function createGeneratedRecipeSeeds(index: RecipeIndex) {
  return { recipes: index }
}
