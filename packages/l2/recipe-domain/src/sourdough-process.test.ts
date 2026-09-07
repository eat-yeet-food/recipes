import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_SOURDOUGH_PROCESS, isSourdoughProcess, sourdoughProcessErrors, sourdoughTimeline } from './sourdough-process.ts'

describe('sourdough process', () => {
  it('preserves the authored timeline and fold identities', () => {
    assert.deepEqual(sourdoughProcessErrors(DEFAULT_SOURDOUGH_PROCESS), [])
    assert.deepEqual(sourdoughTimeline(DEFAULT_SOURDOUGH_PROCESS).map(({ atMinutes }) => atMinutes), [0, 30, 60, 90, 120, 290])
    assert.equal(sourdoughTimeline(DEFAULT_SOURDOUGH_PROCESS)[2].id, 'fold-1')
  })
  it('rejects duplicate, out-of-order, and out-of-bulk folds', () => {
    for (const times of [[60, 60], [90, 60], [20], [290], [300]]) {
      assert.ok(sourdoughProcessErrors({ ...DEFAULT_SOURDOUGH_PROCESS, folds: times.map((atMinutes, index) => ({ id: String(index), atMinutes })) }).length)
    }
  })
  it('supports hand mixing, no autolyse, and a schedule with no folds', () => {
    assert.deepEqual(sourdoughProcessErrors({ ...DEFAULT_SOURDOUGH_PROCESS, mixingMethod: 'hand', autolyseMinutes: 0, folds: [] }), [])
  })
  it('rejects malformed shared state and invalid whole minutes', () => {
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, mixingMethod: 'unknown' }), false)
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, folds: [null] }), false)
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, bulkMinutes: 20.5 }), false)
    assert.ok(sourdoughProcessErrors({ ...DEFAULT_SOURDOUGH_PROCESS, bulkMinutes: 0 }).length)
  })
})
