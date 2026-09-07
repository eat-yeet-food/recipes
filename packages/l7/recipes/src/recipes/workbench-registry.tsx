import type { ComponentType } from 'react'

import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

export interface RecipeWorkbenchDrawerProps {
  recipe: RecipeContent
  config: unknown
  state: unknown
  onApply: (state: unknown) => void
  hasSharedConfiguration: boolean
  storageScope: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface RecipeWorkbenchPlugin {
  id: string
  defaultState: (config: unknown) => unknown | null
  decodeState: (value: unknown, config: unknown, recipe: RecipeContent) => unknown | null
  resolveRecipe: (recipe: RecipeContent, config: unknown, state: unknown) => RecipeContent
  summary: (recipe: RecipeContent, config: unknown, state: unknown) => string
  Drawer: ComponentType<RecipeWorkbenchDrawerProps>
}

export interface RecipeWorkbenchRegistry {
  get: (id: string) => RecipeWorkbenchPlugin | undefined
  register: (plugin: RecipeWorkbenchPlugin) => RecipeWorkbenchRegistry
}

export function createRecipeWorkbenchRegistry(): RecipeWorkbenchRegistry {
  const plugins = new Map<string, RecipeWorkbenchPlugin>()
  const registry: RecipeWorkbenchRegistry = {
    get: (id) => plugins.get(id),
    register: (plugin) => {
      if (plugins.has(plugin.id)) throw new Error(`Recipe workbench already registered: ${plugin.id}`)
      plugins.set(plugin.id, plugin)
      return registry
    },
  }
  return registry
}

export interface ActiveRecipeWorkbench {
  plugin: RecipeWorkbenchPlugin
  config: unknown
  state: unknown
  hasSharedConfiguration: boolean
}

export function activateRecipeWorkbench(
  recipe: RecipeContent,
  registry: RecipeWorkbenchRegistry,
  serializedState?: string,
): ActiveRecipeWorkbench | null {
  const attachment = recipe.workbench
  if (!attachment) return null
  const plugin = registry.get(attachment.id)
  if (!plugin) return null
  let sharedValue: unknown
  if (serializedState) {
    try { sharedValue = JSON.parse(serializedState) } catch { sharedValue = undefined }
  }
  const sharedState = sharedValue === undefined ? null : plugin.decodeState(sharedValue, attachment.config, recipe)
  const state = sharedState ?? plugin.defaultState(attachment.config)
  return state === null ? null : {
    plugin,
    config: attachment.config,
    state,
    hasSharedConfiguration: sharedState !== null,
  }
}
