import { pizzaAreaScale, pizzaBallWeight, isPizzaSizing } from './pizza-sizing.ts'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { calculateFormula, calculateLevainBuild, reverseFormula, formatGrams, formatPercent, type DoughFormula } from './formula.ts'

const sourdough: DoughFormula = {
  family: 'sourdough',
  hydrationPercent: 76,
  saltPercent: 2.1,
  oilPercent: 0,
  sugarPercent: 0,
  maltPercent: 0,
  yeastPercent: 0,
  levainPercent: 20,
  flour: [{ id: 'bread', name: 'Bread flour', percent: 100 }],
  starter: { hydrationPercent: 100, flour: [{ id: 'bread', name: 'Bread flour', percent: 100 }] },
}

describe('dough formula calculations', () => {
  it('matches the published Observable sourdough example', () => {
    const result = calculateFormula(sourdough, { count: 1, pieceWeightGrams: 800, pieceLabel: 'loaf' })
    assert.equal(result.errors.length, 0)
    assert.equal(Math.round(result.freshFlour[0].grams), 404)
    assert.equal(Math.round(result.addedWaterGrams), 296)
    assert.equal(Math.round(result.levainGrams), 90)
    assert.equal(Number(result.saltGrams.toFixed(1)), 9.4)
    assert.equal(Number(result.totalDoughGrams.toFixed(6)), 800)
  })

  it('round trips hardcoded weights with a 77% hydration starter', () => {
    const starter = {
      hydrationPercent: 77,
      flour: [
        { id: 'bread', name: 'Bread flour', percent: 50 },
        { id: 'whole-wheat', name: 'Whole wheat flour', percent: 50 },
      ],
    }
    const reversed = reverseFormula({
      family: 'sourdough',
      freshFlour: [
        { id: 'bread', name: 'Bread flour', grams: 765 },
        { id: 'whole-wheat', name: 'Whole wheat flour', grams: 150 },
      ],
      addedWaterGrams: 705,
      saltGrams: 20,
      levainGrams: 175,
      starter,
    })
    const result = calculateFormula(reversed.formula, { count: 2, pieceWeightGrams: reversed.totalDoughGrams / 2, pieceLabel: 'loaf' })
    assert.equal(reversed.totalDoughGrams, 1815)
    assert.ok(Math.abs(result.addedWaterGrams - 705) < 1e-8)
    assert.ok(Math.abs(result.levainGrams - 175) < 1e-8)
    assert.ok(Math.abs(result.freshFlour.reduce((total, part) => total + part.grams, 0) - 915) < 1e-8)
  })

  it('rejects a target blend that contains less rye than its starter contributes', () => {
    const result = calculateFormula({
      ...sourdough,
      levainPercent: 40,
      flour: [
        { id: 'bread', name: 'Bread flour', percent: 99 },
        { id: 'rye', name: 'Rye flour', percent: 1 },
      ],
      starter: { hydrationPercent: 77, flour: [{ id: 'rye', name: 'Rye flour', percent: 100 }] },
    }, { count: 1, pieceWeightGrams: 900, pieceLabel: 'loaf' })
    assert.ok(result.errors.some((error) => error.includes('more Rye flour')))
  })

  it('accounts for seed hydration and flour composition in a levain build', () => {
    const result = calculateLevainBuild(
      177,
      { hydrationPercent: 77, flour: [{ id: 'bread', name: 'Bread flour', percent: 60 }, { id: 'rye', name: 'Rye flour', percent: 40 }] },
      { hydrationPercent: 50, flour: [{ id: 'rye', name: 'Rye flour', percent: 100 }] },
      2,
    )
    assert.equal(result.errors.length, 0)
    assert.ok(Math.abs(result.seedStarterGrams + result.freshFlour.reduce((total, part) => total + part.grams, 0) + result.addedWaterGrams - 177) < 1e-8)
    assert.ok(Math.abs(result.freshFlour.reduce((total, part) => total + part.grams, 0) / result.seedStarterGrams - 2) < 1e-8)
  })

  it('keeps optional pizza ingredients in exact mass accounting', () => {
    const formula: DoughFormula = {
      family: 'pizza',
      hydrationPercent: 65,
      saltPercent: 2,
      oilPercent: 2,
      sugarPercent: 1.5,
      maltPercent: 0.5,
      yeastPercent: 0.25,
      levainPercent: 0,
      flour: [
        { id: 'bread', name: 'Bread flour', percent: 70 },
        { id: 'whole-wheat', name: 'Whole wheat flour', percent: 30 },
      ],
    }
    const result = calculateFormula(formula, { count: 3, pieceWeightGrams: 480, pieceLabel: 'ball' })
    const accounted = result.freshFlour.reduce((total, part) => total + part.grams, 0) + result.addedWaterGrams + result.saltGrams + result.oilGrams + result.sugarGrams + result.maltGrams + result.yeastGrams
    assert.equal(result.errors.length, 0)
    assert.ok(Math.abs(accounted - 1440) < 1e-8)
  })

  it('rejects hydration below the water already supplied by levain', () => {
    const result = calculateFormula({ ...sourdough, hydrationPercent: 2, levainPercent: 40 }, { count: 1, pieceWeightGrams: 800, pieceLabel: 'loaf' })
    assert.ok(result.errors.some((error) => error.includes('more water')))
  })
})

describe('recipe display precision', () => {
  it('uses whole grams at and above 20g and one decimal below', () => {
    assert.equal(formatGrams(908.8242755752875), '909g')
    assert.equal(formatGrams(20.8), '21g')
    assert.equal(formatGrams(20), '20g')
    assert.equal(formatGrams(19.24), '19.2g')
    assert.equal(formatGrams(2), '2g')
    assert.equal(formatPercent(77.04), '77%')
    assert.equal(formatPercent(17.26), '17.3%')
  })
})

describe('pizza diameter presets', () => {
  const sizing = { referenceDiameterInches: 16, referenceBallWeightGrams: 480, diametersInches: [10, 12, 14, 16] }
  it('scales the authored ball weight by pizza area and rounds to whole grams', () => {
    assert.deepEqual(sizing.diametersInches.map((diameter) => pizzaBallWeight(diameter, sizing)), [188, 270, 368, 480])
    assert.equal(pizzaAreaScale(12, sizing), 0.5625)
  })
  it('rejects invalid sizing configuration', () => {
    assert.equal(isPizzaSizing({ ...sizing, diametersInches: [12, 12] }), false)
    assert.throws(() => pizzaBallWeight(0, sizing))
    assert.throws(() => pizzaBallWeight(12, { ...sizing, referenceDiameterInches: 0 }))
  })
})
