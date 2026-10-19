import type { DoughFormula } from '@eat-yeet/l2-recipe-domain/formula'
import { selectedRecipeMethod, type RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { KitchenPlugin } from '@eat-yeet/l7-kitchen/kitchen/kitchen-plugin'
import { DoughFormulaEditor } from './dough-formula-editor'
import { batchNoun, doughRows, formulaChanges, formulaFacts, withBatchCount } from './dough-kitchen-model'
import { DoughResults } from './dough-results'
import { clone, completeFormula, decodeDoughState, isDoughConfig, resolveWorkbenchRecipe, type DoughWorkbenchState } from './dough-workbench-model'

const methodLabel = (recipe: RecipeContent) => (id: string) => recipe.methodOptions.find((method) => method.id === id)?.label ?? id

function createDoughWorkbenchPlugin(id: string, family: DoughFormula['family'], label: string): KitchenPlugin {
  const decode = (value: unknown, config: unknown, recipe: RecipeContent) => {
    const state = isDoughConfig(config) ? decodeDoughState(value, config, recipe) : null
    return state?.formula.family === family ? state : null
  }
  // Test Kitchen only hands back states this plugin decoded or produced.
  const dough = (state: unknown) => state as DoughWorkbenchState
  return {
    id,
    label,
    defaultState: (config) => isDoughConfig(config) && config.defaultSelection.formula.family === family ? { ...clone(config.defaultSelection), formula: completeFormula(clone(config.defaultSelection.formula)) } : null,
    decodeState: decode,
    resolveRecipe: (recipe, config, state) => {
      const decoded = decode(state, config, recipe)
      return decoded && isDoughConfig(config) ? resolveWorkbenchRecipe(recipe, decoded, config) : recipe
    },
    facts: (recipe, _config, state) => {
      const method = recipe.methodOptions.length > 1 ? selectedRecipeMethod(recipe, dough(state).methodId)?.label : undefined
      return formulaFacts(dough(state), method)
    },
    totals: (_recipe, _config, state) => {
      const { total, totalDetail } = doughRows(dough(state))
      return { total, detail: totalDetail }
    },
    changes: (recipe, _config, from, to) => formulaChanges(dough(from), dough(to), methodLabel(recipe)),
    batchCount: (state) => dough(state).batch.count,
    batchNoun: (state, count) => batchNoun(dough(state), count),
    withBatchCount: (state, count) => withBatchCount(dough(state), count),
    Editor: ({ recipe, config, state, onChange, onErrorsChange, resetKey }) => isDoughConfig(config)
      ? <DoughFormulaEditor recipe={recipe} config={config} state={dough(state)} onChange={onChange} onErrorsChange={onErrorsChange} resetKey={resetKey} />
      : null,
    Results: ({ state }) => <DoughResults state={dough(state)} />,
  }
}

export const createSourdoughWorkbenchPlugin = () => createDoughWorkbenchPlugin('sourdough', 'sourdough', 'Sourdough')
export const createPizzaWorkbenchPlugin = () => createDoughWorkbenchPlugin('pizza', 'pizza', 'Pizza')
