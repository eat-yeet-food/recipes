import type { RecipeSummary, RecipeVariantSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { PageBlock } from './blocks'

export type { PageBlock, RecipeBlock, Section } from './blocks'

export type MixingMethod = 'hand' | 'planetary' | 'spiral'

export type DoughDevelopmentMethod =
  | 'stretch-and-folds'
  | 'coil-folds'
  | 'slap-and-folds'
  | 'rubaud'
  | 'bassinage'

export interface RecipeLearningReference {
  article: string
  label: string
}

export interface RecipeMixingLearning {
  defaultMethod: MixingMethod
  allowedMethods: MixingMethod[]
  targetDevelopment: string
  article: string
  methodArticles: Partial<Record<MixingMethod, string>>
}

export interface RecipeDoughStrengthLearning {
  methods: DoughDevelopmentMethod[]
  article: string
  methodArticles: Partial<Record<DoughDevelopmentMethod, string>>
}

export interface RecipeFinalDoughTemperature {
  targetF: number | null
  rangeF: [number, number] | null
  reason: string
  article: string
}

export interface RecipeLearning {
  mixing?: RecipeMixingLearning
  doughStrength?: RecipeDoughStrengthLearning
  handling: RecipeLearningReference[]
  finalDoughTemperature?: RecipeFinalDoughTemperature
}

export interface RecipeContentVariant extends RecipeVariantSummary {
  blocks: PageBlock[]
}

export interface RecipeContent extends RecipeSummary {
  blocks: PageBlock[]
  variants: RecipeContentVariant[]
  learning?: RecipeLearning
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
