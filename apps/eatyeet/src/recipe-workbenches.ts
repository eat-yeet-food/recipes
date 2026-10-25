import { createRecipeWorkbenchRegistry } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import type { KitchenPlugin } from '@eat-yeet/l7-kitchen/kitchen/kitchen-plugin'
import {
  createPizzaWorkbenchPlugin,
  createSourdoughWorkbenchPlugin,
} from './workbenches/dough-workbench-plugin'

/**
 * The app owns the set of executable calculators. Recipe content only names a
 * registered calculator and supplies opaque authored configuration for it.
 * Recipe pages use their projection; Notebook edits them.
 */
export const recipeWorkbenchRegistry = createRecipeWorkbenchRegistry<KitchenPlugin>()
  .register(createSourdoughWorkbenchPlugin())
  .register(createPizzaWorkbenchPlugin())
