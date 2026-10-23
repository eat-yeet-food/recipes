import { MAX_LEVAIN_EXTRA_PERCENT, calculateDoughLevainBuild, calculateFormula, type DoughBatch, type DoughFormula, type FlourComponent, type StarterProfile } from './formula.ts'
import { isSourdoughProcess } from './sourdough-process.ts'

/** A complete dough configuration: the formula, one batch of it and the recipe method it follows. */
export interface DoughFormulaState {
  version: 1
  batch: DoughBatch
  formula: DoughFormula
  methodId: string
}

const MAX_FLOURS = 20
const MAX_FOLDS = 40
const shortText = (value: unknown, max: number) => typeof value === 'string' && value.length <= max

function isFlourBlend(value: unknown): value is FlourComponent[] {
  return Array.isArray(value) && value.length <= MAX_FLOURS && value.every((part) => part && typeof part === 'object' &&
    shortText(part.id, 100) && shortText(part.name, 80) && Number.isFinite(part.percent))
}

function isStarterProfile(value: unknown): value is StarterProfile {
  return Boolean(value && typeof value === 'object' && Number.isFinite((value as StarterProfile).hydrationPercent) && isFlourBlend((value as StarterProfile).flour))
}

export function isDoughFormula(value: unknown): value is DoughFormula {
  if (!value || typeof value !== 'object') return false
  const formula = value as DoughFormula
  const percentages = [formula.hydrationPercent, formula.saltPercent, formula.oilPercent, formula.sugarPercent, formula.maltPercent, formula.yeastPercent, formula.levainPercent]
  return (
    (formula.family === 'pizza' || formula.family === 'sourdough') &&
    percentages.every(Number.isFinite) &&
    isFlourBlend(formula.flour) &&
    (formula.starter === undefined || isStarterProfile(formula.starter)) &&
    (formula.process === undefined || (formula.family === 'sourdough' && isSourdoughProcess(formula.process) && formula.process.folds.length <= MAX_FOLDS)) &&
    (formula.levainBuild === undefined || (formula.levainBuild !== null && typeof formula.levainBuild === 'object' && isStarterProfile(formula.levainBuild.seed) && Number.isFinite(formula.levainBuild.flourPerSeed) && formula.levainBuild.flourPerSeed > 0 &&
      (formula.levainBuild.extraPercent === undefined || (Number.isFinite(formula.levainBuild.extraPercent) && formula.levainBuild.extraPercent >= 0 && formula.levainBuild.extraPercent <= MAX_LEVAIN_EXTRA_PERCENT))))
  )
}

/** Structural check only; `formulaStateErrors` reports whether the values make a dough. */
export function isDoughFormulaState(value: unknown): value is DoughFormulaState {
  if (!value || typeof value !== 'object') return false
  const state = value as DoughFormulaState
  return state.version === 1 && isDoughFormula(state.formula) && Boolean(state.batch) && typeof state.batch === 'object' &&
    Number.isInteger(state.batch.count) && state.batch.count > 0 &&
    Number.isFinite(state.batch.pieceWeightGrams) && state.batch.pieceWeightGrams > 0 &&
    (state.batch.pieceLabel === 'loaf' || state.batch.pieceLabel === 'ball') &&
    (state.batch.diameterInches === undefined || (state.formula.family === 'pizza' && Number.isFinite(state.batch.diameterInches) && state.batch.diameterInches > 0)) &&
    shortText(state.methodId, 100)
}

/** Every reason this configuration cannot be baked, or none. */
export function formulaStateErrors(state: DoughFormulaState) {
  const weights = calculateFormula(state.formula, state.batch)
  const build = state.formula.levainBuild
  const buildErrors = build && state.formula.starter && weights.levainGrams > 0
    ? calculateDoughLevainBuild(weights.levainGrams, state.formula.starter, build).errors
    : []
  return [...new Set([...weights.errors, ...buildErrors])]
}
