import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

/**
 * A recipe calculator registered by the app. Recipe pages use only its
 * projection: the authored default state written into the recipe (dough
 * weights, bound step text, process steps). Interactive editing lives in
 * Test Kitchen, which extends this contract.
 */
export interface RecipeWorkbenchPlugin {
  id: string
  defaultState: (config: unknown) => unknown | null
  decodeState: (value: unknown, config: unknown, recipe: RecipeContent) => unknown | null
  resolveRecipe: (recipe: RecipeContent, config: unknown, state: unknown) => RecipeContent
}

export interface RecipeWorkbenchRegistry<Plugin extends RecipeWorkbenchPlugin = RecipeWorkbenchPlugin> {
  get: (id: string) => Plugin | undefined
  register: (plugin: Plugin) => RecipeWorkbenchRegistry<Plugin>
}

export function createRecipeWorkbenchRegistry<Plugin extends RecipeWorkbenchPlugin = RecipeWorkbenchPlugin>(): RecipeWorkbenchRegistry<Plugin> {
  const plugins = new Map<string, Plugin>()
  const registry: RecipeWorkbenchRegistry<Plugin> = {
    get: (id) => plugins.get(id),
    register: (plugin) => {
      if (plugins.has(plugin.id)) throw new Error(`Recipe workbench already registered: ${plugin.id}`)
      plugins.set(plugin.id, plugin)
      return registry
    },
  }
  return registry
}

/** The recipe as written: its calculator's authored default applied, when it has one. */
export function authoredRecipe(recipe: RecipeContent, registry: Pick<RecipeWorkbenchRegistry, 'get'>): RecipeContent {
  const attachment = recipe.workbench
  const plugin = attachment ? registry.get(attachment.id) : undefined
  const state = plugin ? plugin.defaultState(attachment!.config) : null
  return plugin && state !== null ? plugin.resolveRecipe(recipe, attachment!.config, state) : recipe
}
