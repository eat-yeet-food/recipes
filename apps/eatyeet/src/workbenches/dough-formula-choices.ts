import { useEffect, useRef, useState } from 'react'
import type { DoughFormula } from '@eat-yeet/l2-recipe-domain/formula'
import type { RecipeWorkbenchChoices, RecipeWorkbenchChoicesProps } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { clone, completeFormula, decodeDoughState, isDoughConfig } from './dough-workbench-model'
import { authoredFormula, formulasMatch, isAuthoredFormula, useWorkbenchStore, withRecipeChoice } from './dough-workbench-store'

const ORIGINAL = 'original'
const CUSTOM = 'custom'
const saved = (id: string) => `saved:${id}`

/**
 * Offers the member's saved formulas beside the recipe summary. The last
 * choice is stored in the account and loads on later visits to the plain
 * recipe URL; a shared `?config=` link always wins.
 */
export function useDoughFormulaChoices(
  { recipe, config, state, onApply, hasSharedConfiguration, storageScope }: RecipeWorkbenchChoicesProps,
  family: DoughFormula['family'],
): RecipeWorkbenchChoices | null {
  const { store, status, persist } = useWorkbenchStore(storageScope)
  const [notice, setNotice] = useState('')
  const restored = useRef(false)
  const doughConfig = isDoughConfig(config) && config.defaultSelection.formula.family === family ? config : null
  const selection = doughConfig ? decodeDoughState(state, doughConfig, recipe) : null
  const presets = store.presets.filter((preset) => preset.formula.family === family)
  const remembered = presets.find((preset) => preset.id === store.defaults[recipe.slug])

  // Decide once per visit, when the account store first arrives.
  useEffect(() => {
    if (status !== 'ready' || restored.current) return
    restored.current = true
    if (hasSharedConfiguration || !doughConfig || !selection || !remembered || formulasMatch(remembered.formula, selection.formula)) return
    onApply({ ...selection, formula: completeFormula(clone(remembered.formula), doughConfig.defaultSelection.formula) }, { replace: true })
  }, [status])

  if (status !== 'ready' || !doughConfig || !selection || presets.length === 0) return null

  const authored = isAuthoredFormula(doughConfig, selection.formula)
  const match = (remembered && formulasMatch(remembered.formula, selection.formula) ? remembered : undefined)
    ?? (authored ? undefined : presets.find((preset) => formulasMatch(preset.formula, selection.formula)))
  const value = match ? saved(match.id) : authored ? ORIGINAL : CUSTOM

  return {
    label: 'Saved formula',
    value,
    options: [
      { value: ORIGINAL, label: 'Original' },
      ...presets.map((preset) => ({ value: saved(preset.id), label: preset.name })),
      ...(value === CUSTOM ? [{ value: CUSTOM, label: 'Custom', disabled: true }] : []),
    ],
    onChange: (next) => {
      const preset = presets.find((item) => saved(item.id) === next)
      if (!preset && next !== ORIGINAL) return
      onApply({ ...selection, formula: preset ? completeFormula(clone(preset.formula), doughConfig.defaultSelection.formula) : authoredFormula(doughConfig, selection.methodId) })
      setNotice('')
      void persist((current) => withRecipeChoice(current, recipe.slug, preset?.id)).then((stored) => {
        if (!stored) setNotice('This choice could not be saved to your account, so it will not be remembered.')
      })
    },
    ...(notice ? { notice } : {}),
  }
}
