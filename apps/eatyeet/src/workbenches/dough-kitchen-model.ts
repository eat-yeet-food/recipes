import { calculateDoughLevainBuild, calculateFormula, formatPercent, levainExtraPercent, type DoughFormula, type FlourComponent, type StarterProfile } from '@eat-yeet/l2-recipe-domain/formula'
import type { DoughFormulaState } from '@eat-yeet/l2-recipe-domain/formula-state'
import type { SourdoughProcess } from '@eat-yeet/l2-recipe-domain/sourdough-process'

/** One difference between two formulas, written for a chip or a History entry. */
export type FormulaChange = { label: string; from: string; to: string }
export type DoughRow = { label: string; amount: string; detail?: string }

const eighthGlyphs: Record<number, string> = { 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' }
// Instant yeast weighs about 3.1g per teaspoon (a 7g packet is 2¼ tsp).
const instantYeastGramsPerTsp = 3.1

export function formatEighths(amount: number) {
  const eighths = Math.round(amount * 8)
  const whole = Math.floor(eighths / 8)
  const remainder = eighths % 8
  return remainder === 0 ? String(whole) : `${whole > 0 ? `${whole} ` : ''}${eighthGlyphs[remainder]}`
}
export const formatYeastTeaspoons = (grams: number) => {
  const tsp = grams / instantYeastGramsPerTsp
  return tsp < 0.0625 ? 'less than ⅛ tsp' : `${formatEighths(tsp)} tsp`
}
const trimmed = (value: number, places: number) => String(Number(value.toFixed(places)))
/** Whole grams from 20g; one decimal below (Numeric editing contract). */
export const formatDoughGrams = (value: number) => Number.isFinite(value) ? `${Math.abs(value) >= 20 ? Math.round(value).toLocaleString('en-US') : trimmed(value, 1)}g` : '—'
export const formatYeastGrams = (value: number) => Number.isFinite(value) ? `${Math.abs(value) >= 20 ? Math.round(value) : trimmed(value, 2)}g` : '—'
const yeastPercent = (value: number) => `${trimmed(value, 2)}%`
const pieces = (count: number, label: 'loaf' | 'ball', family: DoughFormula['family']) =>
  family === 'pizza' ? (count === 1 ? 'pizza' : 'pizzas') : label === 'loaf' ? (count === 1 ? 'loaf' : 'loaves') : (count === 1 ? 'ball' : 'balls')

export function batchLabel(state: DoughFormulaState) {
  const { batch, formula } = state
  if (formula.family === 'pizza' && batch.diameterInches) return `${batch.count} × ${batch.diameterInches}-inch`
  return `${batch.count} × ${formatDoughGrams(batch.pieceWeightGrams)}`
}

/** The library card line: batch, hydration and method or mixing. */
export function formulaFacts(state: DoughFormulaState, methodLabel?: string) {
  const { batch, formula } = state
  const parts = [
    formula.family === 'pizza' && batch.diameterInches ? `${batch.count} × ${batch.diameterInches}-inch` : `${batch.count} ${pieces(batch.count, batch.pieceLabel, formula.family)}`,
    `${formatPercent(formula.hydrationPercent)} hydration`,
  ]
  if (methodLabel) parts.push(methodLabel)
  else if (formula.process) parts.push(formula.process.mixingMethod === 'hand' ? 'Hand mixed' : 'Spiral mixer')
  return parts.join(' · ')
}

/** Ingredient weights for the dough panel, in recipe order. */
/** Notes that the build makes more than the dough uses, e.g. " (use 175g; the rest stays in the jar)". */
export const levainYield = (buildGrams: number, levainGrams: number, format: (grams: number) => string) =>
  buildGrams - levainGrams >= 1 ? ` (use ${format(levainGrams)}; the rest stays in the jar)` : ''

export function doughRows(state: DoughFormulaState): { total: string; totalDetail: string; rows: DoughRow[]; levainBuild: string | null } {
  const { formula, batch } = state
  const result = calculateFormula(formula, batch)
  const rows: DoughRow[] = result.freshFlour.filter((part) => part.grams > 0.005).map((part) => ({ label: part.name, amount: formatDoughGrams(part.grams) }))
  rows.push({ label: 'Water', amount: formatDoughGrams(result.addedWaterGrams) })
  if (result.levainGrams > 0) rows.push({ label: `Ripe levain (${formatPercent(formula.starter?.hydrationPercent ?? 0)} hydration)`, amount: formatDoughGrams(result.levainGrams) })
  if (result.oilGrams > 0.005) rows.push({ label: 'Oil', amount: formatDoughGrams(result.oilGrams) })
  if (result.sugarGrams > 0.005) rows.push({ label: 'Sugar', amount: formatDoughGrams(result.sugarGrams) })
  if (result.maltGrams > 0.005) rows.push({ label: 'Malt powder', amount: formatDoughGrams(result.maltGrams) })
  if (result.yeastGrams > 0.005) rows.push(formula.family === 'pizza'
    ? { label: 'SAF red instant yeast', amount: formatYeastGrams(result.yeastGrams), detail: formatYeastTeaspoons(result.yeastGrams) }
    : { label: 'Instant yeast', amount: formatYeastGrams(result.yeastGrams) })
  rows.push({ label: 'Fine sea salt', amount: formatDoughGrams(result.saltGrams) })
  const build = formula.levainBuild && formula.starter && result.levainGrams > 0
    ? calculateDoughLevainBuild(result.levainGrams, formula.starter, formula.levainBuild) : null
  return {
    total: formatDoughGrams(result.totalDoughGrams),
    totalDetail: batch.count === 1 ? `1 ${pieces(1, batch.pieceLabel, formula.family)}` : `${batch.count} ${pieces(batch.count, batch.pieceLabel, formula.family)} × ${formatDoughGrams(batch.pieceWeightGrams)}`,
    rows,
    levainBuild: build && build.errors.length === 0
      ? [`${formatDoughGrams(build.seedStarterGrams)} seed starter`, ...build.freshFlour.map((part) => `${formatDoughGrams(part.grams)} ${part.name}`), `${formatDoughGrams(build.addedWaterGrams)} water`].join(' + ') + levainYield(build.buildGrams, result.levainGrams, formatDoughGrams)
      : null,
  }
}

const blend = (flour: FlourComponent[]) => flour.map((part) => `${formatPercent(part.percent)} ${part.name}`).join(', ')
const sameBlend = (a: FlourComponent[], b: FlourComponent[]) => blend(a) === blend(b)
const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? rest ? `${hours} hr ${rest} min` : `${hours} hr` : `${rest} min`
}
const foldNames = { 'stretch-and-fold': 'stretch and fold', 'coil-fold': 'coil fold', lamination: 'lamination' } as const
const schedule = (process: SourdoughProcess) => process.folds.length
  ? process.folds.map((fold) => `${foldNames[fold.method ?? process.foldMethod]} at ${duration(fold.atMinutes)}`).join(', ')
  : 'No folds'
const starterText = (starter?: StarterProfile) => starter ? `${formatPercent(starter.hydrationPercent)} hydration, ${blend(starter.flour)}` : 'None'

/**
 * Everything that differs from `from` to `to`, in the order the editor shows
 * it. Labels and values are plain text so the same list serves the
 * "Changed from the recipe" strip and History.
 */
export function formulaChanges(from: DoughFormulaState, to: DoughFormulaState, methodLabel: (id: string) => string): FormulaChange[] {
  const changes: FormulaChange[] = []
  const add = (label: string, a: string, b: string) => { if (a !== b) changes.push({ label, from: a, to: b }) }
  add('Batch', batchLabel(from), batchLabel(to))
  add(to.formula.family === 'pizza' ? 'Oven' : 'Method', methodLabel(from.methodId), methodLabel(to.methodId))
  const a = from.formula, b = to.formula
  if (!sameBlend(a.flour, b.flour)) changes.push({ label: 'Flour', from: blend(a.flour), to: blend(b.flour) })
  add('Hydration', formatPercent(a.hydrationPercent), formatPercent(b.hydrationPercent))
  add('Salt', formatPercent(a.saltPercent), formatPercent(b.saltPercent))
  if (b.family === 'pizza') {
    add('Yeast', yeastPercent(a.yeastPercent), yeastPercent(b.yeastPercent))
    add('Sugar', formatPercent(a.sugarPercent), formatPercent(b.sugarPercent))
    add('Oil', formatPercent(a.oilPercent), formatPercent(b.oilPercent))
    add('Malt', formatPercent(a.maltPercent), formatPercent(b.maltPercent))
  } else {
    add('Levain', formatPercent(a.levainPercent), formatPercent(b.levainPercent))
    add('Starter', starterText(a.starter), starterText(b.starter))
    if (a.levainBuild && b.levainBuild) {
      add('Levain build', `1:${trimmed(a.levainBuild.flourPerSeed, 1)}`, `1:${trimmed(b.levainBuild.flourPerSeed, 1)}`)
      add('Seed starter', starterText(a.levainBuild.seed), starterText(b.levainBuild.seed))
      add('Extra levain', formatPercent(levainExtraPercent(a.levainBuild)), formatPercent(levainExtraPercent(b.levainBuild)))
    }
  }
  if (a.process && b.process) {
    add('Mixing', a.process.mixingMethod === 'hand' ? 'By hand' : 'Spiral mixer', b.process.mixingMethod === 'hand' ? 'By hand' : 'Spiral mixer')
    add('Autolyse', duration(a.process.autolyseMinutes), duration(b.process.autolyseMinutes))
    add('Salt added at', duration(a.process.saltDelayMinutes), duration(b.process.saltDelayMinutes))
    add('Bulk', duration(a.process.bulkMinutes), duration(b.process.bulkMinutes))
    add('Folds', schedule(a.process), schedule(b.process))
  }
  return changes
}

/** A bake-sheet batch: same formula and piece weight, a different count. */
export const withBatchCount = (state: DoughFormulaState, count: number): DoughFormulaState => ({ ...state, batch: { ...state.batch, count } })
export const batchNoun = (state: DoughFormulaState, count = state.batch.count) => pieces(count, state.batch.pieceLabel, state.formula.family)
