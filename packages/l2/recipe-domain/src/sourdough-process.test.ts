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
  it('preserves mixed techniques through serialization and uses the legacy method for older steps', () => {
    const process = JSON.parse(JSON.stringify({ ...DEFAULT_SOURDOUGH_PROCESS, folds: [
      { id: 'stretch', atMinutes: 60, method: 'stretch-and-fold' },
      { id: 'laminate', atMinutes: 75, method: 'lamination' },
      { id: 'coil', atMinutes: 90, method: 'coil-fold' },
      { id: 'legacy', atMinutes: 120 },
    ] }))
    assert.deepEqual(sourdoughProcessErrors(process), [])
    assert.deepEqual(sourdoughTimeline(process).filter((event) => event.kind === 'fold').map((event) => event.method), ['stretch-and-fold', 'lamination', 'coil-fold', 'coil-fold'])
    const legacy = { ...DEFAULT_SOURDOUGH_PROCESS, foldMethod: 'stretch-and-fold' as const }
    assert.ok(sourdoughTimeline(legacy).filter((event) => event.kind === 'fold').every((event) => event.method === 'stretch-and-fold'))
    process.folds[1].method = 'unsupported'
    assert.equal(isSourdoughProcess(process), false)
  })
  it('rejects malformed shared state and invalid whole minutes', () => {
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, mixingMethod: 'unknown' }), false)
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, folds: [null] }), false)
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, bulkMinutes: 20.5 }), false)
    assert.ok(sourdoughProcessErrors({ ...DEFAULT_SOURDOUGH_PROCESS, bulkMinutes: 0 }).length)
  })
})
