import { createRecipeWorkbenchRegistry } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import {
  createPizzaWorkbenchPlugin,
  createSourdoughWorkbenchPlugin,
} from './workbenches/dough-formula-workbench'

/**
 * The app owns the set of executable workbenches. Recipe content only names a
 * registered workbench and supplies opaque authored configuration for it.
 */
export const recipeWorkbenchRegistry = createRecipeWorkbenchRegistry()
  .register(createSourdoughWorkbenchPlugin())
  .register(createPizzaWorkbenchPlugin())
