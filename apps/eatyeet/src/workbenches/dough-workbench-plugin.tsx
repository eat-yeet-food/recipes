import { DoughWorkbenchSurface } from './dough-workbench-surface'
import { lazy, Suspense } from 'react'
import type { DoughFormula } from '@eat-yeet/l2-recipe-domain/formula'
import { selectedRecipeMethod } from '@eat-yeet/l4-content-model/recipes'
import { Dialog, DialogDescription, DialogTitle } from '@eat-yeet/l5-ui-primitives/primitives/dialog'
import type { RecipeWorkbenchDrawerProps, RecipeWorkbenchPlugin } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { clone, completeFormula, isDoughConfig, decodeDoughState, resolveWorkbenchRecipe, selectionSummary, formatAppliedGrams } from './dough-workbench-model'

const DoughFormulaWorkbench = lazy(() => import('./dough-formula-workbench').then(({ DoughFormulaWorkbench }) => ({ default: DoughFormulaWorkbench })))

function DoughWorkbenchDrawer(props: RecipeWorkbenchDrawerProps, family: DoughFormula['family']) {
  if (!props.open || !isDoughConfig(props.config)) return null
  const state = decodeDoughState(props.state, props.config, props.recipe)
  if (!state || state.formula.family !== family) return null
  return <Suspense fallback={<Dialog open={props.open} onOpenChange={props.onOpenChange}><DoughWorkbenchSurface><header className="px-6 py-5 pr-14"><DialogTitle className="font-hero text-[30px] leading-tight font-normal">Adjust recipe</DialogTitle><DialogDescription className="mt-2 text-ink" role="status">Loading calculator…</DialogDescription></header></DoughWorkbenchSurface></Dialog>}>
    <DoughFormulaWorkbench {...props} config={props.config} selection={state} onApply={(next) => props.onApply(next)} />
  </Suspense>
}

function createDoughWorkbenchPlugin(id: string, family: DoughFormula['family']): RecipeWorkbenchPlugin {
  return {
    id,
    defaultState: (config) => isDoughConfig(config) && config.defaultSelection.formula.family === family ? { ...clone(config.defaultSelection), formula: completeFormula(clone(config.defaultSelection.formula)) } : null,
    decodeState: (value, config, recipe) => {
      const state = isDoughConfig(config) ? decodeDoughState(value, config, recipe) : null
      return state?.formula.family === family ? state : null
    },
    resolveRecipe: (recipe, config, state) => {
      if (!isDoughConfig(config)) return recipe
      const decoded = decodeDoughState(state, config, recipe)
      return decoded?.formula.family === family ? resolveWorkbenchRecipe(recipe, decoded, config) : recipe
    },
    summary: (recipe, config, state) => {
      const decoded = isDoughConfig(config) ? decodeDoughState(state, config, recipe) : null
      return decoded?.formula.family === family ? selectionSummary(decoded, selectedRecipeMethod(recipe, decoded.methodId), formatAppliedGrams) : ''
    },
    Drawer: (props) => DoughWorkbenchDrawer(props, family),
  }
}

export const createSourdoughWorkbenchPlugin = () => createDoughWorkbenchPlugin('sourdough', 'sourdough')
export const createPizzaWorkbenchPlugin = () => createDoughWorkbenchPlugin('pizza', 'pizza')
