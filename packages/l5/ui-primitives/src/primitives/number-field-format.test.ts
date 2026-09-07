import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatNumberFieldValue } from './number-field-format.ts'

describe('numeric field display precision', () => {
  it('rounds the reported long dough weight to whole grams', () => {
    const weight = 908.8242755752875
    assert.equal(formatNumberFieldValue(weight, 0), '909')
  })

  it('uses practical ingredient, percentage, and ratio precision', () => {
    assert.equal(formatNumberFieldValue(1846.824275, 1), '1846.8')
    assert.equal(formatNumberFieldValue(4.824275, 2), '4.82')
    assert.equal(formatNumberFieldValue(0.025275, 3), '0.025')
    assert.equal(formatNumberFieldValue(77.0438125, 2), '77.04')
    assert.equal(formatNumberFieldValue(2.333333333333, 2), '2.33')
    assert.equal(formatNumberFieldValue(10, 2), '10')
  })

  it('does not display tiny nonzero quantities as zero', () => {
    assert.equal(formatNumberFieldValue(0.000025275, 3), '0.000025')
    assert.equal(formatNumberFieldValue(0.1, 0), '0.1')
    assert.equal(formatNumberFieldValue(1e-8, 2), '0.00000001')
    assert.equal(formatNumberFieldValue(-0.000025275, 3), '-0.000025')
  })

  it('removes insignificant zeros and handles nonfinite values', () => {
    assert.equal(formatNumberFieldValue(-0, 3), '0')
    assert.equal(formatNumberFieldValue(1.5, 3), '1.5')
    assert.equal(formatNumberFieldValue(NaN, 2), '')
    assert.equal(formatNumberFieldValue(Infinity, 2), '')
  })
})
