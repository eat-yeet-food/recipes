import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DoughFormulaState } from '@eat-yeet/l2-recipe-domain/formula-state'
import { batchNoun, doughRows, formulaChanges, formulaFacts, withBatchCount } from './dough-kitchen-model.ts'
import { resolveSourdoughSteps, sourdoughSchedule } from './sourdough-process.ts'
import { pizzaSchedule, resolvePizzaSteps } from './pizza-process.ts'

const recipe: DoughFormulaState = {
  version: 1,
  methodId: 'outdoor-oven',
  batch: { count: 3, pieceWeightGrams: 480, diameterInches: 16, pieceLabel: 'ball' },
  formula: {
    family: 'pizza', hydrationPercent: 65, saltPercent: 2, oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0.25, levainPercent: 0,
    flour: [{ id: 'kirkland', name: 'Kirkland Organic All-Purpose Flour', percent: 100 }],
  },
}
const friday: DoughFormulaState = {
  ...recipe,
  batch: { count: 4, pieceWeightGrams: 368, diameterInches: 14, pieceLabel: 'ball' },
  formula: { ...recipe.formula, hydrationPercent: 68, saltPercent: 2.2, yeastPercent: 0.2 },
}
const methods = (id: string) => ({ 'outdoor-oven': 'Outdoor Oven', 'indoor-steel': 'Indoor Steel' })[id] ?? id

describe('Notebook dough model', () => {
  it('matches the recipe page weights for the authored pizza', () => {
    const { total, rows } = doughRows(recipe)
    assert.equal(total, '1,440g')
    assert.deepEqual(rows.map((row) => [row.label, row.amount, row.detail]), [
      ['Kirkland Organic All-Purpose Flour', '861g', undefined],
      ['Water', '560g', undefined],
      ['SAF red instant yeast', '2.15g', '¾ tsp'],
      ['Fine sea salt', '17.2g', undefined],
    ])
  })

  it('lists exactly what changed, in editor order', () => {
    assert.deepEqual(formulaChanges(recipe, friday, methods), [
      { label: 'Batch', from: '3 × 16-inch', to: '4 × 14-inch' },
      { label: 'Hydration', from: '65%', to: '68%' },
      { label: 'Salt', from: '2%', to: '2.2%' },
      { label: 'Yeast', from: '0.25%', to: '0.2%' },
    ])
    assert.deepEqual(formulaChanges(friday, friday, methods), [])
    assert.deepEqual(formulaChanges(recipe, { ...recipe, methodId: 'indoor-steel' }, methods), [{ label: 'Oven', from: 'Outdoor Oven', to: 'Indoor Steel' }])
  })

  it('describes formulas for cards and the bake sheet', () => {
    assert.equal(formulaFacts(friday, 'Outdoor Oven'), '4 × 14-inch · 68% hydration · Outdoor Oven')
    const today = withBatchCount(friday, 5)
    assert.equal(today.batch.count, 5)
    assert.equal(friday.batch.count, 4)
    assert.equal(batchNoun(today), 'pizzas')
    assert.equal(doughRows(today).rows[0].amount, '1,080g')
  })

  it('describes sourdough process changes', () => {
    const process = { mixingMethod: 'spiral' as const, foldMethod: 'coil-fold' as const, autolyseMinutes: 180, saltDelayMinutes: 30, bulkMinutes: 290, folds: [{ id: 'f1', atMinutes: 60 }] }
    const loaf: DoughFormulaState = {
      version: 1, methodId: 'dutch-oven', batch: { count: 2, pieceWeightGrams: 907.5, pieceLabel: 'loaf' },
      formula: { family: 'sourdough', hydrationPercent: 77, saltPercent: 2, oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0, levainPercent: 17,
        flour: [{ id: 'bread', name: 'Bread flour', percent: 100 }], starter: { hydrationPercent: 77, flour: [{ id: 'bread', name: 'Bread flour', percent: 100 }] }, process },
    }
    const changed = { ...loaf, formula: { ...loaf.formula, process: { ...process, mixingMethod: 'hand' as const, folds: [...process.folds, { id: 'f2', atMinutes: 90, method: 'lamination' as const }] } } }
    assert.deepEqual(formulaChanges(loaf, changed, () => 'Dutch oven'), [
      { label: 'Mixing', from: 'Spiral mixer', to: 'By hand' },
      { label: 'Folds', from: '1 fold at 1 hr', to: '2 folds, 1 hr to 1 hr 30 min' },
    ])
    assert.equal(formulaFacts(loaf), '2 loaves · 77% hydration · Spiral mixer')
  })

  it('builds 30% extra levain and reports changes to it', () => {
    const starter = { hydrationPercent: 77, flour: [{ id: 'bread', name: 'Bread flour', percent: 50 }, { id: 'whole-wheat', name: 'Whole wheat flour', percent: 50 }] }
    const loaf: DoughFormulaState = {
      version: 1, methodId: 'dutch-oven', batch: { count: 2, pieceWeightGrams: 907.5, pieceLabel: 'loaf' },
      formula: { family: 'sourdough', hydrationPercent: 77.04, saltPercent: 1.97, oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0, levainPercent: 17.26,
        flour: [{ id: 'bread', name: 'Bread flour', percent: 80.33 }, { id: 'whole-wheat', name: 'Whole wheat flour', percent: 19.67 }], starter, levainBuild: { seed: starter, flourPerSeed: 2 } },
    }
    assert.equal(doughRows(loaf).levainBuild, '50g seed starter + 50g Bread flour + 50g Whole wheat flour + 77g water (use 175g; the rest stays in the jar)')
    const exact = { ...loaf, formula: { ...loaf.formula, levainBuild: { seed: starter, flourPerSeed: 2, extraPercent: 0 } } }
    assert.equal(doughRows(exact).levainBuild, '39g seed starter + 39g Bread flour + 39g Whole wheat flour + 59g water')
    assert.deepEqual(formulaChanges(loaf, exact, () => 'Dutch oven'), [{ label: 'Extra levain', from: '30%', to: '0%' }])
  })
})

describe('sourdough steps', () => {
  const sections = [
    { id: 'autolyse', title: 'Autolyse (3h before bulk)', items: ['x'], itemIds: ['x'] },
    { id: 'bulk', title: 'Bulk Fermentation', items: ['x'], itemIds: ['x'] },
  ]
  const bindings = { autolyse: 'autolyse', bulk: 'bulk', levain: 'levain' }
  const process = { mixingMethod: 'hand' as const, foldMethod: 'coil-fold' as const, autolyseMinutes: 180, saltDelayMinutes: 10, bulkMinutes: 320, benchMinutes: 40, bulkTemperatureF: 75, folds: [{ id: 'f1', atMinutes: 30 }, { id: 'f2', atMinutes: 60 }] }
  it('puts elapsed times on a rail through the refrigerator', () => {
    const bulk = resolveSourdoughSteps(sections, bindings, process).find((section) => section.id === 'bulk')!
    assert.deepEqual(bulk.itemTimes!.map((time) => time.label), ['0m', '10m', '30m', '1h', '5:20h', '6h'])
    assert.equal(bulk.itemTimes![1].rest, 'Cover at 75°F for 20m.')
    assert.equal(bulk.itemTimes![4].rest, 'Preshape and shaping rests: 40m.')
    assert.ok(bulk.items.every((item) => !item.includes('elapsed')))
  })
  it('drops autolyse and fermentolyse steps that are turned off', () => {
    const steps = (autolyseMinutes: number, saltDelayMinutes: number) => resolveSourdoughSteps(sections, bindings, { ...process, autolyseMinutes, saltDelayMinutes })
    assert.equal(steps(180, 10).length, 2)
    assert.equal(steps(0, 10).length, 1)
    assert.match(steps(0, 10)[0].items[0], /^Mix the flour, the first portion of water \(\{\{initialWaterGrams\}\}\) and the ripe levain/)
    assert.match(steps(180, 0)[1].items[0], /^Mix in the ripe levain .*Add fine sea salt and the remaining water/)
    assert.equal(steps(180, 0)[1].itemTimes![1].label, '30m')
    assert.match(steps(0, 0)[0].items[0], /all of the water \(\{\{addedWaterGrams\}\}\), the ripe levain and fine sea salt/)
  })
  it('splits preshape, shape and refrigerate onto the rail and replaces the bound Shape section', () => {
    const withShape = [...sections, { id: 'shape', title: 'Shape', items: ['Divide…', 'Shape…', 'Stitch, cover and place in 37°F refrigerator for 12-18h'], itemIds: ['a', 'b', 'c'] }]
    const result = resolveSourdoughSteps(withShape, { ...bindings, shape: 'shape' }, { ...process, preshapeMinutes: 30 })
    assert.equal(result.some((section) => section.id === 'shape'), false)
    const bulk = result.find((section) => section.id === 'bulk')!
    assert.deepEqual(bulk.itemTimes!.slice(-3).map((time) => time.label), ['5:20h', '5:50h', '6h'])
    assert.deepEqual(bulk.itemTimes!.slice(-3).map((time) => time.rest), ['Rest at 75°F for 30m.', 'Rest at 75°F for 10m.', undefined])
    assert.match(bulk.items.at(-3)!, /^Divide into \{\{pieceCount\}\}/)
    assert.equal(bulk.items.at(-1), 'Stitch, cover and place in 37°F refrigerator for 12-18h')
    assert.deepEqual(sourdoughSchedule({ ...process, preshapeMinutes: 30 }).slice(-3).map((row) => `${row.time} ${row.label}`), ['5:20h Divide and preshape', '5:50h Shape', '6h Stitch and refrigerate'])
  })
  it('summarizes the schedule and flags folds after dividing', () => {
    assert.deepEqual(sourdoughSchedule(process).map((row) => `${row.time} ${row.label}`), ['Before Autolyse, 3h', '0m Mix in the levain', '10m Salt and remaining water', '30m 2 × coil folds, every 30m', '5:20h Divide, preshape and shape', '6h Into the refrigerator'])
    assert.ok(sourdoughSchedule({ ...process, bulkMinutes: 60 }).some((row) => row.problem))
  })
})

describe('pizza steps', () => {
  const section = (id: string, items: [string, string][]) => ({ id, title: id, items: items.map(([, text]) => text), itemIds: items.map(([itemId]) => itemId) })
  const steps = [
    section('steps-1', [
      ['steps-1-item-1', 'Chill the water.'], ['combine-dough', 'Add the {{mixingIngredients}} to the spiral mixer.'], ['steps-1-item-3', 'Mix until 72°F.'],
      ['steps-1-item-4', 'Ball and cover. Bulk ferment at 76°F for 1h.'], ['divide-dough', 'Divide into balls.'], ['steps-1-item-6', 'Cover and place in the refrigerator for 2–4 days.'],
    ]),
    section('steps-3', [['steps-3-item-1', 'Warm up.'], ['steps-3-item-2', 'Preheat.']]),
  ]
  const base = { mixingMethod: 'spiral', bulkTemperatureF: 76, bulkMinutes: 60, coldDays: 2, warmUpMinutes: 240 } as const

  it('puts the spiral mixer dough on a rail from the start of mixing', () => {
    const [dough, bake] = resolvePizzaSteps(steps, base)
    assert.deepEqual(dough.itemTimes!.map((time) => [time.label, time.rest]), [['0m', 'Bulk ferment at 76°F for 1h.'], ['1h', undefined]])
    assert.equal(dough.items[0], 'Chill the water. Add the {{mixingIngredients}} to the spiral mixer. Mix until 76°F. Ball and cover.')
    assert.match(resolvePizzaSteps(steps, { ...base, bulkTemperatureF: 74 })[0].items[0], /Mix until 74°F\./)
    assert.equal(dough.items[1], 'Divide into balls. Cover and place in the refrigerator for 2 days.')
    assert.equal(dough.timeOrigin, 'Time since you start mixing')
    assert.match(bake.items[0], /room temperature for 4h\.$/)
  })

  it('rests by hand within bulk and matches the warm-up to the cold ferment', () => {
    const [dough, bake] = resolvePizzaSteps(steps, { ...base, mixingMethod: 'hand', coldDays: 4, warmUpMinutes: 120 })
    assert.deepEqual(dough.itemTimes!.map((time) => [time.label, time.rest]), [['0m', 'Cover and rest for 20m.'], ['20m', 'Bulk ferment at 76°F for 40m.'], ['1h', undefined]])
    assert.match(dough.items[1], /until smooth and about 76°F\./)
    assert.match(dough.items[2], /refrigerator for 4 days\.$/)
    assert.match(bake.items[0], /for 2h\.$/)
  })

  it('mixes in a food processor to about the bulk temperature', () => {
    const [dough] = resolvePizzaSteps(steps, { ...base, mixingMethod: 'food-processor' })
    assert.match(dough.items[0], /food processor fitted with the dough blade and run on high until the dough reaches about 76°F/)
    assert.equal(dough.items.length, 2)
  })

  it('lists the schedule through bake day', () => {
    assert.deepEqual(pizzaSchedule({ ...base, coldDays: 3, warmUpMinutes: 180 }).map((row) => [row.time, row.label]), [
      ['0m', 'Mix in the spiral mixer'], ['1h', 'Divide, ball and refrigerate 3 days'], ['Day 4', 'Out of the refrigerator 3h before baking'],
    ])
  })

  it('reports schedule changes against the recipe', () => {
    const changed = { ...recipe, formula: { ...recipe.formula, pizzaProcess: { ...base, mixingMethod: 'food-processor' as const, coldDays: 3, warmUpMinutes: 180 } } }
    assert.deepEqual(formulaChanges(recipe, changed, methods).map((change) => [change.label, change.from, change.to]), [
      ['Mixing', 'Spiral mixer', 'Food processor'], ['Cold ferment', '2 days', '3 days'], ['Warm-up', '4 hr', '3 hr'],
    ])
  })
})
