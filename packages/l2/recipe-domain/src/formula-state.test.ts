import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formulaStateErrors, isDoughFormulaState, type DoughFormulaState } from './formula-state.ts'

const pizza: DoughFormulaState = {
  version: 1,
  methodId: 'outdoor-oven',
  batch: { count: 3, pieceWeightGrams: 480, diameterInches: 16, pieceLabel: 'ball' },
  formula: {
    family: 'pizza', hydrationPercent: 65, saltPercent: 2, oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0.25, levainPercent: 0,
    flour: [{ id: 'all-purpose', name: 'All-purpose flour', percent: 100 }],
  },
}

describe('dough formula state', () => {
  it('accepts a complete pizza state with no errors', () => {
    assert.equal(isDoughFormulaState(pizza), true)
    assert.deepEqual(formulaStateErrors(pizza), [])
  })

  it('rejects malformed shapes', () => {
    assert.equal(isDoughFormulaState({ ...pizza, version: 2 }), false)
    assert.equal(isDoughFormulaState({ ...pizza, batch: { ...pizza.batch, count: 1.5 } }), false)
    assert.equal(isDoughFormulaState({ ...pizza, formula: { ...pizza.formula, family: 'bagel' } }), false)
    assert.equal(isDoughFormulaState({ ...pizza, formula: { ...pizza.formula, flour: [{ id: 'x', name: 'x'.repeat(81), percent: 100 }] } }), false)
    assert.equal(isDoughFormulaState({ ...pizza, methodId: 7 }), false)
  })

  it('bounds the extra levain', () => {
    const starter = { hydrationPercent: 77, flour: [{ id: 'all-purpose', name: 'All-purpose flour', percent: 100 }] }
    const withExtra = (extraPercent: number) => ({ ...pizza, formula: { ...pizza.formula, family: 'sourdough' as const, yeastPercent: 0, levainPercent: 20, starter, levainBuild: { seed: starter, flourPerSeed: 2, extraPercent } }, batch: { count: 1, pieceWeightGrams: 900, pieceLabel: 'loaf' as const } })
    assert.equal(isDoughFormulaState(withExtra(30)), true)
    assert.equal(isDoughFormulaState(withExtra(-1)), false)
    assert.equal(isDoughFormulaState(withExtra(101)), false)
  })

  it('rejects a pizza diameter on sourdough and a process on pizza', () => {
    assert.equal(isDoughFormulaState({ ...pizza, formula: { ...pizza.formula, process: { mixingMethod: 'hand', foldMethod: 'coil-fold', autolyseMinutes: 0, saltDelayMinutes: 0, bulkMinutes: 60, folds: [] } } }), false)
  })

  it('reports values that cannot make a dough', () => {
    const errors = formulaStateErrors({ ...pizza, formula: { ...pizza.formula, flour: [{ id: 'a', name: 'All-purpose flour', percent: 90 }] } })
    assert.ok(errors.some((error) => error.includes('100%')))
  })
})
