import { sourdoughProcessErrors, type SourdoughProcess } from './sourdough-process.ts'

export interface FlourComponent {
  id: string
  name: string
  percent: number
}

export interface StarterProfile {
  hydrationPercent: number
  flour: FlourComponent[]
}

export interface DoughFormula {
  family: 'sourdough' | 'pizza'
  hydrationPercent: number
  saltPercent: number
  oilPercent: number
  sugarPercent: number
  maltPercent: number
  yeastPercent: number
  levainPercent: number
  flour: FlourComponent[]
  starter?: StarterProfile
  process?: SourdoughProcess
  levainBuild?: { seed: StarterProfile; flourPerSeed: number }
}

export interface DoughBatch {
  count: number
  pieceWeightGrams: number
  pieceLabel: 'loaf' | 'ball'
}

export interface FormulaWeights {
  totalDoughGrams: number
  totalFlourGrams: number
  totalWaterGrams: number
  freshFlour: Array<FlourComponent & { grams: number }>
  addedWaterGrams: number
  saltGrams: number
  oilGrams: number
  sugarGrams: number
  maltGrams: number
  yeastGrams: number
  levainGrams: number
  levainFlourGrams: number
  levainWaterGrams: number
  prefermentedFlourPercent: number
  errors: string[]
}

export interface ReverseFormulaInput {
  family: DoughFormula['family']
  freshFlour: Array<{ id: string; name: string; grams: number }>
  addedWaterGrams: number
  saltGrams: number
  oilGrams?: number
  sugarGrams?: number
  maltGrams?: number
  yeastGrams?: number
  levainGrams?: number
  starter?: StarterProfile
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const ratio = (value: number) => value / 100
const finiteNonNegative = (value: number) => Number.isFinite(value) && value >= 0

export function flourBlendErrors(flour: FlourComponent[], label = 'Flour blend') {
  const errors: string[] = []
  if (flour.length === 0) errors.push(`${label} needs at least one flour.`)
  if (flour.some((part) => !part.name.trim())) errors.push(`${label} names cannot be empty.`)
  if (flour.some((part) => !finiteNonNegative(part.percent))) errors.push(`${label} percentages must be zero or greater.`)
  const total = sum(flour.map((part) => part.percent))
  if (Math.abs(total - 100) > 0.01) errors.push(`${label} must total 100% (currently ${formatPercent(total)}).`)
  return errors
}

export function calculateFormula(formula: DoughFormula, batch: DoughBatch): FormulaWeights {
  const total = batch.count * batch.pieceWeightGrams
  const starter = formula.starter
  const errors = [
    ...flourBlendErrors(formula.flour),
    ...(formula.process ? sourdoughProcessErrors(formula.process) : []),
    ...(starter ? flourBlendErrors(starter.flour, 'Starter flour blend') : []),
  ]
  const percentages = [formula.hydrationPercent, formula.saltPercent, formula.oilPercent, formula.sugarPercent, formula.maltPercent, formula.yeastPercent]
  if (!finiteNonNegative(total) || total <= 0) errors.push('Batch count and piece weight must produce a positive dough weight.')
  if (percentages.some((value) => !finiteNonNegative(value))) errors.push('Formula percentages must be zero or greater.')
  if (!finiteNonNegative(formula.levainPercent)) errors.push('Levain percentage must be zero or greater.')
  if (formula.levainPercent > 0 && !starter) errors.push('Starter hydration and flour are required when levain is used.')
  if (starter && (!finiteNonNegative(starter.hydrationPercent) || starter.hydrationPercent <= 0)) errors.push('Starter hydration must be greater than zero.')

  const totalFlour = total / (1 + ratio(sum(percentages)))
  const totalWater = totalFlour * ratio(formula.hydrationPercent)
  const levain = totalFlour * ratio(formula.levainPercent)
  const levainFlour = starter ? levain / (1 + ratio(starter.hydrationPercent)) : 0
  const levainWater = levain - levainFlour
  const starterById = new Map((starter?.flour ?? []).map((part) => [part.id, part.percent]))
  const freshFlour = formula.flour.map((part) => {
    const target = totalFlour * ratio(part.percent)
    const contributed = levainFlour * ratio(starterById.get(part.id) ?? 0)
    const grams = target - contributed
    if (grams < -0.01) errors.push(`The starter contributes more ${part.name} than the total flour blend allows.`)
    return { ...part, grams: Math.max(0, grams) }
  })
  const targetIds = new Set(formula.flour.map((part) => part.id))
  for (const part of starter?.flour ?? []) {
    if (!targetIds.has(part.id) && levainFlour * ratio(part.percent) > 0.01) {
      errors.push(`Add ${part.name} to the total flour blend because it is present in the starter.`)
    }
  }
  const addedWater = totalWater - levainWater
  if (addedWater < -0.01) errors.push('The starter contributes more water than the target hydration allows.')

  return {
    totalDoughGrams: total,
    totalFlourGrams: totalFlour,
    totalWaterGrams: totalWater,
    freshFlour,
    addedWaterGrams: Math.max(0, addedWater),
    saltGrams: totalFlour * ratio(formula.saltPercent),
    oilGrams: totalFlour * ratio(formula.oilPercent),
    sugarGrams: totalFlour * ratio(formula.sugarPercent),
    maltGrams: totalFlour * ratio(formula.maltPercent),
    yeastGrams: totalFlour * ratio(formula.yeastPercent),
    levainGrams: levain,
    levainFlourGrams: levainFlour,
    levainWaterGrams: levainWater,
    prefermentedFlourPercent: totalFlour > 0 ? levainFlour / totalFlour * 100 : 0,
    errors: [...new Set(errors)],
  }
}

export function reverseFormula(input: ReverseFormulaInput): { formula: DoughFormula; totalDoughGrams: number; errors: string[] } {
  const starter = input.starter
  const levain = input.levainGrams ?? 0
  const levainFlour = starter ? levain / (1 + ratio(starter.hydrationPercent)) : 0
  const levainWater = levain - levainFlour
  const freshTotal = sum(input.freshFlour.map((part) => part.grams))
  const totalFlour = freshTotal + levainFlour
  const starterById = new Map((starter?.flour ?? []).map((part) => [part.id, part.percent]))
  const ids = new Set([...input.freshFlour.map((part) => part.id), ...(starter?.flour ?? []).map((part) => part.id)])
  const flour = [...ids].map((id) => {
    const fresh = input.freshFlour.find((part) => part.id === id)
    const starterPart = starter?.flour.find((part) => part.id === id)
    const grams = (fresh?.grams ?? 0) + levainFlour * ratio(starterById.get(id) ?? 0)
    return { id, name: fresh?.name ?? starterPart?.name ?? id, percent: totalFlour > 0 ? grams / totalFlour * 100 : 0 }
  })
  const pct = (grams = 0) => totalFlour > 0 ? grams / totalFlour * 100 : 0
  const total = freshTotal + input.addedWaterGrams + input.saltGrams + (input.oilGrams ?? 0) + (input.sugarGrams ?? 0) + (input.maltGrams ?? 0) + (input.yeastGrams ?? 0) + levain
  const formula: DoughFormula = {
    family: input.family,
    hydrationPercent: pct(input.addedWaterGrams + levainWater),
    saltPercent: pct(input.saltGrams),
    oilPercent: pct(input.oilGrams),
    sugarPercent: pct(input.sugarGrams),
    maltPercent: pct(input.maltGrams),
    yeastPercent: pct(input.yeastGrams),
    levainPercent: pct(levain),
    flour,
    ...(starter ? { starter } : {}),
  }
  const errors = [
    ...(totalFlour <= 0 ? ['Fresh flour and starter must provide some flour.'] : []),
    ...([...input.freshFlour.map((part) => part.grams), input.addedWaterGrams, input.saltGrams, input.oilGrams ?? 0, input.sugarGrams ?? 0, input.maltGrams ?? 0, input.yeastGrams ?? 0, levain].some((value) => !finiteNonNegative(value)) ? ['Ingredient weights must be zero or greater.'] : []),
    ...(starter ? flourBlendErrors(starter.flour, 'Starter flour blend') : []),
    ...(starter && (!finiteNonNegative(starter.hydrationPercent) || starter.hydrationPercent <= 0) ? ['Starter hydration must be greater than zero.'] : []),
  ]
  return { formula, totalDoughGrams: total, errors }
}

export interface LevainBuildResult {
  seedStarterGrams: number
  freshFlour: Array<FlourComponent & { grams: number }>
  addedWaterGrams: number
  errors: string[]
}

export function calculateLevainBuild(
  levainWeight: number,
  target: StarterProfile,
  seed: StarterProfile,
  seedToFreshFlourRatio = 2,
): LevainBuildResult {
  const errors = [
    ...flourBlendErrors(target.flour, 'Levain flour blend'),
    ...flourBlendErrors(seed.flour, 'Seed flour blend'),
  ]
  if (levainWeight <= 0) errors.push('Levain weight must be greater than zero.')
  if (seedToFreshFlourRatio <= 0) errors.push('Seed-to-fresh-flour ratio must be greater than zero.')
  if (!finiteNonNegative(target.hydrationPercent)) errors.push('Levain hydration must be zero or greater.')
  if (!finiteNonNegative(seed.hydrationPercent)) errors.push('Seed hydration must be zero or greater.')
  const totalFlour = levainWeight / (1 + ratio(target.hydrationPercent))
  // A 1:2 feed means one gram of ripe seed starter for every two grams of
  // fresh flour. The seed's own flour/water split must therefore be removed
  // before solving the target levain flour and hydration.
  const seedStarter = totalFlour / (seedToFreshFlourRatio + 1 / (1 + ratio(seed.hydrationPercent)))
  const seedFlour = seedStarter / (1 + ratio(seed.hydrationPercent))
  const seedWater = seedFlour * ratio(seed.hydrationPercent)
  const seedById = new Map(seed.flour.map((part) => [part.id, part.percent]))
  const freshFlour = target.flour.map((part) => {
    const grams = totalFlour * ratio(part.percent) - seedFlour * ratio(seedById.get(part.id) ?? 0)
    if (grams < -0.01) errors.push(`The seed contributes more ${part.name} than the levain blend allows.`)
    return { ...part, grams: Math.max(0, grams) }
  })
  const targetIds = new Set(target.flour.map((part) => part.id))
  for (const part of seed.flour) {
    if (!targetIds.has(part.id) && seedFlour * ratio(part.percent) > 0.01) {
      errors.push(`Add ${part.name} to the levain flour blend because it is present in the seed.`)
    }
  }
  const addedWater = totalFlour * ratio(target.hydrationPercent) - seedWater
  if (addedWater < -0.01) errors.push('The seed contributes more water than the levain hydration allows.')
  return { seedStarterGrams: seedStarter, freshFlour, addedWaterGrams: Math.max(0, addedWater), errors: [...new Set(errors)] }
}

export function formatGrams(value: number) {
  if (!Number.isFinite(value)) return '—'
  return `${Math.abs(value) >= 20 ? Math.round(value) : Number(value.toFixed(1))}g`
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '—'
  return `${Number(value.toFixed(1))}%`
}
