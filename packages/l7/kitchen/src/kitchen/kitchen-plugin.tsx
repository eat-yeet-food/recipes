import type { ComponentType } from 'react'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { RecipeWorkbenchPlugin, RecipeWorkbenchRegistry } from '@eat-yeet/l7-recipes/recipes/workbench-registry'

/** One difference between two configurations, as plain text for a chip or a History entry. */
export type KitchenChange = { label: string; from: string; to: string }

export type KitchenEditorProps = {
  recipe: RecipeContent
  config: unknown
  state: unknown
  onChange: (state: unknown) => void
  /** Every reason the current fields cannot be saved; empty when they can. */
  onErrorsChange: (errors: string[]) => void
  /** Changing it discards typed field text, e.g. after Reset or Restore. */
  resetKey: number
}

export type KitchenResultsProps = { recipe: RecipeContent; config: unknown; state: unknown }

/**
 * A recipe calculator that Test Kitchen can edit. The app supplies the
 * editor and results for its own dough families; Test Kitchen owns pages,
 * saving and history.
 */
export interface KitchenPlugin extends RecipeWorkbenchPlugin {
  /** Library group heading, e.g. "Pizza". */
  label: string
  facts: (recipe: RecipeContent, config: unknown, state: unknown) => string
  totals: (recipe: RecipeContent, config: unknown, state: unknown) => { total: string; detail: string }
  changes: (recipe: RecipeContent, config: unknown, from: unknown, to: unknown) => KitchenChange[]
  batchCount: (state: unknown) => number
  batchNoun: (state: unknown, count: number) => string
  withBatchCount: (state: unknown, count: number) => unknown
  Editor: ComponentType<KitchenEditorProps>
  Results: ComponentType<KitchenResultsProps>
}

export type KitchenRegistry = RecipeWorkbenchRegistry<KitchenPlugin>

/** A published recipe with a Test Kitchen calculator, ready to edit. */
export type KitchenRecipe = {
  recipe: RecipeContent
  plugin: KitchenPlugin
  config: unknown
  /** The recipe as written. */
  defaultState: unknown
}

export function kitchenRecipe(recipe: RecipeContent, registry: KitchenRegistry): KitchenRecipe | null {
  const attachment = recipe.workbench
  const plugin = attachment ? registry.get(attachment.id) : undefined
  const defaultState = plugin ? plugin.defaultState(attachment!.config) : null
  return plugin && defaultState !== null ? { recipe, plugin, config: attachment!.config, defaultState } : null
}

/** A stored state still valid for this recipe, or null. */
export const decodeKitchenState = (kitchen: KitchenRecipe, value: unknown) => kitchen.plugin.decodeState(value, kitchen.config, kitchen.recipe)

export const kitchenPath = (slug: string, formulaId?: string, bake = false) =>
  `/kitchen/${slug}${formulaId ? `/${formulaId}` : ''}${bake ? '/bake' : ''}`
