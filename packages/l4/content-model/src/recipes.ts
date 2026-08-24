import type { RecipeSummary, RecipeVariantSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { PageBlock } from './blocks'

export type { PageBlock, RecipeBlock, Section } from './blocks'

export interface RecipeContentVariant extends RecipeVariantSummary {
  blocks: PageBlock[]
}

export interface RecipeContent extends RecipeSummary {
  blocks: PageBlock[]
  variants: RecipeContentVariant[]
}

export function selectedRecipeVariant(recipe: RecipeContent, variantId?: string) {
  if (recipe.variants.length === 0) return null

  return (
    recipe.variants.find((variant) => variant.id === variantId) ??
    recipe.variants.find((variant) => variant.id === recipe.defaultVariant) ??
    recipe.variants[0] ??
    null
  )
}

export function recipeWithSelectedVariant(recipe: RecipeContent, variantId?: string): RecipeContent {
  const variant = selectedRecipeVariant(recipe, variantId)
  if (!variant) return recipe

  return {
    ...recipe,
    description: variant.description || recipe.description,
    prepMinutes: variant.prepMinutes,
    cookMinutes: variant.cookMinutes,
    totalMinutes: variant.totalMinutes,
    yieldAmount: variant.yieldAmount,
    yieldUnit: variant.yieldUnit,
    blocks: variant.blocks,
  }
}
