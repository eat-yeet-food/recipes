/** Static recipe helpers. App-specific data is supplied by app modules. */

import type { GetRecipeRequest, ListRecipesRequest, RecipeIndex, RecipeService } from '@eat-yeet/l3-api-contract/recipes'
export { imageUrl, type RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

export function listStaticRecipes(index: RecipeIndex, request: ListRecipesRequest = {}) {
  const limit = request.limit && request.limit > 0 ? request.limit : undefined
  return limit ? index.slice(0, limit) : index
}

export const findStaticRecipe = (index: RecipeIndex, slug: string) => index.find((recipe) => recipe.slug === slug)

type GeneratedBodyModules<RecipeBody> = Record<string, () => Promise<{ default: RecipeBody }>>

async function getGeneratedRecipe<RecipeBody>(
  bodies: GeneratedBodyModules<RecipeBody>,
  recipeDir: string,
  { slug }: GetRecipeRequest,
): Promise<RecipeBody | null> {
  const load = bodies[`${recipeDir}/${slug}.json`]
  if (!load) return null
  return (await load()).default
}

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
      return { recipe: await getGeneratedRecipe(bodies, recipeDir, request) }
    },
  }
}

export function createGeneratedRecipeSeeds(index: RecipeIndex) {
  return { recipes: index }
}
