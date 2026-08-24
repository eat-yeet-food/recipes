import type { RecipeIndex } from '@eat-yeet/l3-api-contract/recipes'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { createGeneratedRecipeSeeds, createGeneratedRecipeService } from '@eat-yeet/l3-api-static/recipes'

const INDEX_FILE = '/apps/eatyeet/generated/index.json'
const RECIPE_DIR = '/apps/eatyeet/generated/recipes'
const indexes = import.meta.glob<{ default: RecipeIndex }>('/apps/eatyeet/generated/index.json', { eager: true })
const bodies = import.meta.glob<{ default: RecipeContent }>('/apps/eatyeet/generated/recipes/*.json')
const index = indexes[INDEX_FILE]?.default ?? []

export const recipeStubService = createGeneratedRecipeService(index, bodies, RECIPE_DIR)
export const recipeStubSeeds = createGeneratedRecipeSeeds(index)
