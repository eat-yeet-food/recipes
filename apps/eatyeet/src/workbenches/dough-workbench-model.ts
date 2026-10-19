import { isPizzaSizing, pizzaAreaScale, pizzaBallWeight, type PizzaSizing } from '@eat-yeet/l2-recipe-domain/pizza-sizing'
import { DEFAULT_SOURDOUGH_PROCESS } from '@eat-yeet/l2-recipe-domain/sourdough-process'
import { isDoughFormula, isDoughFormulaState, type DoughFormulaState } from '@eat-yeet/l2-recipe-domain/formula-state'
import { calculateFormula, calculateLevainBuild, formatPercent, type DoughFormula, type StarterProfile } from '@eat-yeet/l2-recipe-domain/formula'
import { formatNumberFieldValue, type NumberFieldPrecision } from '@eat-yeet/l5-ui-primitives/primitives/number-field-format'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { recipeWithSelectedMethod } from '@eat-yeet/l4-content-model/recipes'
import { formatYeastGrams, formatYeastTeaspoons, formatEighths } from './dough-kitchen-model'
import { resolveSourdoughSteps, type SourdoughProcessSections, type SpiralMixerProfile } from './sourdough-process'

export type InputMode = 'weights' | 'target'

export type DoughWorkbenchState = DoughFormulaState

export interface DoughWorkbenchConfig {
  pizzaSizing?: PizzaSizing
  spiralMixer?: SpiralMixerProfile
  processSections?: SourdoughProcessSections
  defaultInputMode: InputMode
  defaultSelection: DoughWorkbenchState
  recommendedFormulas: Record<string, DoughFormula>
  doughIngredientSectionId?: string
  hiddenIngredientSectionIds?: string[]
  initialWaterPercent?: number
  perPieceIngredientLabel?: string
  perPieceIngredientQuantities?: Record<string, { quantity: number; unit: string }>
}

export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
export const pieceCountLabel = (count: number, label: 'loaf' | 'ball') => label === 'loaf' ? (count === 1 ? 'loaf' : 'loaves') : (count === 1 ? 'ball' : 'balls')
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
export const formatWorkbenchGrams = (value: number) => Number.isFinite(value) ? `${formatNumberFieldValue(value, Math.abs(value) >= 20 ? 0 : 1)}g` : '—'
export const yeastGramPrecision = (value: number): NumberFieldPrecision => Math.abs(value) >= 20 ? 0 : 2
export const formatAppliedGrams = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  return `${value < 20 ? Number(value.toFixed(1)) : Math.round(value)}g`
}
export const completeFormula = (formula: DoughFormula, fallback?: DoughFormula): DoughFormula => formula.family === 'sourdough' ? {
  ...formula,
  process: clone(formula.process ?? fallback?.process ?? DEFAULT_SOURDOUGH_PROCESS),
  levainBuild: clone(formula.levainBuild ?? { seed: starterFrom(formula), flourPerSeed: 2 }),
} : formula


function dynamicDoughItems(selection: DoughWorkbenchState, formatWeight = formatWorkbenchGrams) {
  const result = calculateFormula(selection.formula, selection.batch)
  const items = result.freshFlour.filter((part) => part.grams > 0.005).map((part) => `${formatWeight(part.grams)} ${part.name}`)
  items.push(`${formatWeight(result.addedWaterGrams)} water`)
  if (result.levainGrams > 0) items.push(`${formatWeight(result.levainGrams)} ripe levain (${formatPercent(selection.formula.starter?.hydrationPercent ?? 0)} hydration)`)
  if (result.oilGrams > 0.005) items.push(`${formatWeight(result.oilGrams)} oil`)
  if (result.sugarGrams > 0.005) items.push(`${formatWeight(result.sugarGrams)} sugar`)
  if (result.maltGrams > 0.005) items.push(`${formatWeight(result.maltGrams)} malt powder`)
  if (result.yeastGrams > 0.005) items.push(selection.formula.family === 'pizza'
    ? `${formatYeastTeaspoons(result.yeastGrams)} (${formatYeastGrams(result.yeastGrams)}) SAF red instant yeast`
    : `${formatYeastGrams(result.yeastGrams)} instant yeast`)
  items.push(`${formatWeight(result.saltGrams)} fine sea salt`)
  return { result, items }
}

function renderFormulaBindings(value: string, selection: DoughWorkbenchState, config: DoughWorkbenchConfig, result: ReturnType<typeof calculateFormula>) {
  if (!value.includes('{{')) return value
  const initialWaterGrams = result.addedWaterGrams * ((config.initialWaterPercent ?? 100) / 100)
  const remainingWaterGrams = result.addedWaterGrams - initialWaterGrams
  const ingredients = ['water', 'flour']
  if (result.oilGrams > 0.005) ingredients.push('oil')
  if (result.sugarGrams > 0.005) ingredients.push('sugar')
  if (result.maltGrams > 0.005) ingredients.push('malt powder')
  ingredients.push('fine sea salt')
  if (result.yeastGrams > 0.005) ingredients.push(selection.formula.family === 'pizza' ? 'SAF red instant yeast' : 'instant yeast')
  const mixingIngredients = ingredients.length < 2 ? ingredients.join('') : `${ingredients.slice(0, -1).join(', ')}, and ${ingredients.at(-1)}`
  const plural = pieceCountLabel(selection.batch.count, selection.batch.pieceLabel)
  const bindings: Record<string, string> = {
    initialWaterGrams: formatAppliedGrams(initialWaterGrams),
    remainingWaterGrams: formatAppliedGrams(remainingWaterGrams),
    pizzaDiameter: selection.batch.diameterInches ? `${selection.batch.diameterInches} inches` : 'your preferred size',
    pieceCount: String(selection.batch.count),
    pieceLabelPlural: plural,
    pieceWeightGrams: formatAppliedGrams(selection.batch.pieceWeightGrams),
    totalDoughGrams: formatAppliedGrams(result.totalDoughGrams),
    mixingIngredients,
  }
  return value.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g, (token, key) => bindings[key] ?? token)
}

export function resolveWorkbenchRecipe(recipe: RecipeContent, selection: DoughWorkbenchState, config: DoughWorkbenchConfig): RecipeContent {
  const selected = recipeWithSelectedMethod(recipe, selection.methodId)
  if (!recipe.workbench) return selected
  const { result, items: rawItems } = dynamicDoughItems(selection, formatAppliedGrams)
  const process = selection.formula.process
  const seedBuild = selection.formula.levainBuild
  const levain = seedBuild && selection.formula.starter && result.levainGrams > 0
    ? calculateLevainBuild(result.levainGrams, selection.formula.starter, seedBuild.seed, seedBuild.flourPerSeed) : null
  const levainIngredients = levain ? [`${formatWorkbenchGrams(levain.seedStarterGrams)} seed starter`, ...levain.freshFlour.map((part) => `${formatWorkbenchGrams(part.grams)} ${part.name}`), `${formatWorkbenchGrams(levain.addedWaterGrams)} water`].map(escapeHtml).join(' + ') : undefined
  const toppingScale = selection.batch.diameterInches && config.pizzaSizing ? pizzaAreaScale(selection.batch.diameterInches, config.pizzaSizing) : 1
  const items = rawItems.map(escapeHtml)
  const blocks = selected.blocks.map((block) => {
    if (block.type !== 'recipe') return block
    const doughTitle = selection.formula.family === 'pizza' ? 'Dough' : 'Bread dough'
    const doughSectionId = config.doughIngredientSectionId ?? 'dough'
    const replacedSectionIds = new Set([doughSectionId, ...(config.hiddenIngredientSectionIds ?? [])])
    const otherIngredients = block.ingredients.filter((section) => !replacedSectionIds.has(section.id))
    const ingredients = [{ id: doughSectionId, title: doughTitle, items, itemIds: result.freshFlour.filter((part) => part.grams > 0.005).map((part) => `flour-${part.id}`).concat(['water'], result.levainGrams > 0 ? ['levain'] : [], result.oilGrams > 0.005 ? ['oil'] : [], result.sugarGrams > 0.005 ? ['sugar'] : [], result.maltGrams > 0.005 ? ['malt'] : [], result.yeastGrams > 0.005 ? ['yeast'] : [], ['salt']) }, ...otherIngredients.map((section) => {
      const label = config.perPieceIngredientLabel ?? selection.batch.pieceLabel
      return {
        ...section,
        title: section.id === 'pizza-toppings' ? `Pizza toppings (per ${label}; ${selection.batch.count} total)` : section.title,
        items: section.items.map((item, index) => {
          const quantity = config.perPieceIngredientQuantities?.[section.itemIds[index]]
          if (!quantity) return item
          const display = (amount: number) => {
            if ((quantity.unit === 'tsp' || quantity.unit === 'tbsp') && amount > 0 && amount < 0.125) return `less than ⅛ ${quantity.unit}`
            if ((quantity.unit === 'tsp' || quantity.unit === 'tbsp') && Math.abs(amount * 8 - Math.round(amount * 8)) < 0.0001) return `${formatEighths(amount)} ${quantity.unit}`
            return `${quantity.unit === 'g' && amount >= 20 ? Math.round(amount) : Number(amount.toFixed(1))} ${quantity.unit}`
          }
          return `${display(quantity.quantity * toppingScale)} ${item} (${display(quantity.quantity * toppingScale * selection.batch.count)} total)`
        }),
      }
    })]
    const processSteps = process && config.processSections ? resolveSourdoughSteps(block.steps, config.processSections, process, levainIngredients, config.spiralMixer) : block.steps
    const steps = processSteps.map((section) => ({
      ...section,
      items: section.items.map((item) => renderFormulaBindings(item, selection, config, result)),
    }))
    const formulaNote = selection.formula.family === 'pizza'
      ? `This dough is ${formatPercent(selection.formula.hydrationPercent)} hydration and makes ${selection.batch.count} × ${formatAppliedGrams(selection.batch.pieceWeightGrams)} balls (${formatAppliedGrams(result.totalDoughGrams)} total).`
      : `This dough is ${formatPercent(selection.formula.hydrationPercent)} hydration with ${formatPercent(result.prefermentedFlourPercent)} prefermented flour and makes ${selection.batch.count} × ${formatAppliedGrams(selection.batch.pieceWeightGrams)} ${pieceCountLabel(selection.batch.count, 'loaf')}.`
    const notes = [formulaNote, ...block.notes.filter((note) => !/formula uses|dough formula|lands around/i.test(note))]
    const equipment = process?.mixingMethod === 'hand' ? block.equipment.map((section) => {
      const keep = section.items.map((item, index) => ({ item, id: section.itemIds[index] })).filter(({ item }) => !/spiral mixer/i.test(item))
      return { ...section, items: keep.map(({ item }) => item), itemIds: keep.map(({ id }) => id) }
    }) : block.equipment
    return { ...block, equipment, ingredients, steps, notes }
  })
  return {
    ...selected,
    blocks,
    ...(process && config.processSections ? {
      totalMinutes: selected.totalMinutes === null ? null : Math.max(0, selected.totalMinutes + process.autolyseMinutes + process.bulkMinutes - (config.defaultSelection.formula.process ?? DEFAULT_SOURDOUGH_PROCESS).autolyseMinutes - (config.defaultSelection.formula.process ?? DEFAULT_SOURDOUGH_PROCESS).bulkMinutes),
      learning: selected.learning?.mixing ? { ...selected.learning, mixing: { ...selected.learning.mixing, defaultMethod: process.mixingMethod } } : selected.learning,
    } : {}),
    yieldAmount: selection.batch.count,
    yieldUnit: selection.formula.family === 'pizza' ? selection.batch.diameterInches ? `${selection.batch.diameterInches}-inch pizzas` : 'pizzas' : selection.batch.count === 1 ? 'loaf' : 'loaves',
  }
}

const isDoughState = isDoughFormulaState

export function isDoughConfig(value: unknown): value is DoughWorkbenchConfig {
  if (!value || typeof value !== 'object') return false
  const config = value as Partial<DoughWorkbenchConfig>
  const mixer = config.spiralMixer
  return (
    (config.pizzaSizing === undefined || isPizzaSizing(config.pizzaSizing)) &&
    (config.defaultInputMode === 'weights' || config.defaultInputMode === 'target') &&
    isDoughState(config.defaultSelection) &&
    (mixer === undefined || Boolean(mixer && typeof mixer.name === 'string' && [mixer.initialRpm, mixer.targetTemperatureF, mixer.saltRpm, mixer.saltMinutes, mixer.finishRpm, mixer.finishMinutes].every((number) => Number.isFinite(number) && number > 0) && Array.isArray(mixer.initialMinutes) && mixer.initialMinutes.length === 2 && mixer.initialMinutes.every((number) => Number.isFinite(number) && number > 0) && mixer.initialMinutes[0] <= mixer.initialMinutes[1])) &&
    (config.processSections === undefined || Boolean(config.processSections && ['autolyse', 'bulk', 'levain'].every((key) => typeof config.processSections?.[key as keyof SourdoughProcessSections] === 'string'))) &&
    Boolean(config.recommendedFormulas && typeof config.recommendedFormulas === 'object' && Object.values(config.recommendedFormulas).every(isDoughFormula))
  )
}

export function decodeDoughState(value: unknown, config: DoughWorkbenchConfig, recipe: RecipeContent): DoughWorkbenchState | null {
  if (!isDoughState(value)) return null
  const state = { ...value, batch: { ...value.batch }, formula: completeFormula(value.formula, config.defaultSelection.formula) }
  if (
    state.formula.family !== config.defaultSelection.formula.family ||
    !recipe.methodOptions.some((method) => method.id === state.methodId)
  ) return null
  if (state.formula.family === 'pizza' && config.pizzaSizing) {
    if (state.batch.diameterInches !== undefined && !config.pizzaSizing.diametersInches.includes(state.batch.diameterInches)) return null
    if (state.batch.diameterInches === undefined) state.batch.diameterInches = config.pizzaSizing.diametersInches.find((diameter) => pizzaBallWeight(diameter, config.pizzaSizing!) === state.batch.pieceWeightGrams)
  }
  const weights = calculateFormula(state.formula, state.batch)
  const formulaErrors = weights.errors
  const levainBuild = state.formula.levainBuild
  const buildErrors = levainBuild && state.formula.starter && weights.levainGrams > 0 ? calculateLevainBuild(weights.levainGrams, state.formula.starter, levainBuild.seed, levainBuild.flourPerSeed).errors : []
  return formulaErrors.length === 0 && buildErrors.length === 0 ? state : null
}

export function starterFrom(formula: DoughFormula): StarterProfile {
  return clone(formula.starter ?? { hydrationPercent: 77, flour: formula.flour })
}
