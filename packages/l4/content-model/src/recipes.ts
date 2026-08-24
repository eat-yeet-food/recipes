import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { PageBlock } from './blocks'

export type { PageBlock, RecipeBlock, Section } from './blocks'

export interface RecipeContent extends RecipeSummary {
  blocks: PageBlock[]
}
