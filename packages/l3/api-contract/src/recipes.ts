import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

export type RecipeIndex = RecipeSummary[]

export interface ListRecipesRequest {
  limit?: number
}

export interface GetRecipeRequest {
  slug: string
}

export interface GetRecipeResponse<RecipeBody = unknown> {
  recipe: RecipeBody | null
}

export interface ListRecipesResponse {
  recipes: RecipeIndex
}

export interface RecipeService<RecipeBody = unknown> {
  listRecipes(request?: ListRecipesRequest): Promise<ListRecipesResponse>
  getRecipe(request: GetRecipeRequest): Promise<GetRecipeResponse<RecipeBody>>
}
