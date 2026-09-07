import type { RecipeMethodSummary, RecipeSummary, RecipeWorkbenchAttachment } from '@eat-yeet/l1-recipe-model/recipes'
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

export interface RecipeContentMethod extends RecipeMethodSummary {
  blocks: PageBlock[]
}

export interface RecipeContent extends RecipeSummary {
  blocks: PageBlock[]
  methodOptions: RecipeContentMethod[]
  workbench?: RecipeWorkbenchAttachment
  learning?: RecipeLearning
}

export function selectedRecipeMethod(recipe: RecipeContent, methodId?: string) {
  if (recipe.methodOptions.length === 0) return null

  return (
    recipe.methodOptions.find((method) => method.id === methodId) ??
    recipe.methodOptions.find((method) => method.id === recipe.defaultMethod) ??
    recipe.methodOptions[0] ??
    null
  )
}

export function recipeWithSelectedMethod(recipe: RecipeContent, methodId?: string): RecipeContent {
  const method = selectedRecipeMethod(recipe, methodId)
  if (!method) return recipe

  return {
    ...recipe,
    description: method.description || recipe.description,
    prepMinutes: method.prepMinutes,
    cookMinutes: method.cookMinutes,
    totalMinutes: method.totalMinutes,
    yieldAmount: method.yieldAmount,
    yieldUnit: method.yieldUnit,
    blocks: method.blocks,
  }
}
