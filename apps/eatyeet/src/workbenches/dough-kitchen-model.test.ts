import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DoughFormulaState } from '@eat-yeet/l2-recipe-domain/formula-state'
import { batchNoun, doughRows, formulaChanges, formulaFacts, withBatchCount } from './dough-kitchen-model.ts'

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
      { label: 'Folds', from: 'coil fold at 1 hr', to: 'coil fold at 1 hr, lamination at 1 hr 30 min' },
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
