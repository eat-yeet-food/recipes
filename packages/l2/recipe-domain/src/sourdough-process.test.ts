import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_SOURDOUGH_PROCESS, foldGroups, foldsFromGroups, parseDuration, bannetonPieceWeight, estimateBulkMinutes, isSourdoughProcess, levainToFridgeMinutes, targetRisePercent, sourdoughProcessErrors, sourdoughTimeline } from './sourdough-process.ts'

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
  it('counts bulk from levain until the dough goes into the refrigerator', () => {
    assert.equal(levainToFridgeMinutes({ ...DEFAULT_SOURDOUGH_PROCESS, bulkMinutes: 320, benchMinutes: 40 }), 360)
    assert.equal(levainToFridgeMinutes(DEFAULT_SOURDOUGH_PROCESS), 290)
    assert.ok(sourdoughProcessErrors({ ...DEFAULT_SOURDOUGH_PROCESS, benchMinutes: -5 }).length)
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, benchMinutes: 2.5 }), false)
  })
  it('validates an optional bulk temperature', () => {
    assert.deepEqual(sourdoughProcessErrors({ ...DEFAULT_SOURDOUGH_PROCESS, bulkTemperatureF: 75 }), [])
    assert.ok(sourdoughProcessErrors({ ...DEFAULT_SOURDOUGH_PROCESS, bulkTemperatureF: 110 }).length)
    assert.equal(isSourdoughProcess({ ...DEFAULT_SOURDOUGH_PROCESS, bulkTemperatureF: 'warm' }), false)
  })
  it('scales bulk time from the guidelines and a reference bake', () => {
    assert.equal(estimateBulkMinutes(75, 20), 420)
    assert.equal(estimateBulkMinutes(70, 20), 720)
    const reference = { bulkTemperatureF: 75, bulkMinutes: 290, levainPercent: 17.26 }
    assert.equal(estimateBulkMinutes(75, 17.26, reference), 290)
    assert.equal(estimateBulkMinutes(70, 17.26, reference), 495)
    assert.ok(estimateBulkMinutes(85, 17.26, reference)! < estimateBulkMinutes(80, 17.26, reference)!)
    assert.ok(estimateBulkMinutes(75, 30, reference)! < 290)
    assert.equal(estimateBulkMinutes(75, 0, reference), null)
  })
  it('targets a lower rise as dough gets warmer', () => {
    assert.deepEqual([60, 65, 70, 72, 75, 80, 88].map(targetRisePercent), [100, 100, 75, 65, 50, 30, 30])
  })
  it('suggests a smaller loaf for a cooler bulk', () => {
    assert.equal(bannetonPieceWeight(907.5, 75, 75), 907.5)
    assert.equal(bannetonPieceWeight(907.5, 75, 70), 850)
    assert.equal(bannetonPieceWeight(907.5, 75, 73), 907.5)
    assert.equal(bannetonPieceWeight(907.5, 75, 80), 907.5)
    assert.ok(bannetonPieceWeight(907.5, 75, 72) < 907.5)
  })
})

describe('fold groups', () => {
  const authored = { ...DEFAULT_SOURDOUGH_PROCESS, saltDelayMinutes: 10, bulkMinutes: 320, folds: [
    { id: 'fold-1', atMinutes: 30, method: 'stretch-and-fold' as const },
    { id: 'fold-2', atMinutes: 45, method: 'stretch-and-fold' as const },
    { id: 'fold-3', atMinutes: 60, method: 'stretch-and-fold' as const },
    { id: 'fold-4', atMinutes: 90, method: 'coil-fold' as const },
    { id: 'fold-5', atMinutes: 120, method: 'coil-fold' as const },
    { id: 'fold-6', atMinutes: 150, method: 'coil-fold' as const },
  ] }
  it('reads the authored schedule as two groups and writes it back unchanged', () => {
    const plan = foldGroups(authored)
    assert.equal(plan.startMinutes, 20)
    assert.deepEqual(plan.groups.map(({ method, count, everyMinutes }) => [method, count, everyMinutes]), [['stretch-and-fold', 3, 15], ['coil-fold', 3, 30]])
    assert.deepEqual(foldsFromGroups(10, plan, () => 'new'), authored.folds)
  })
  it('keeps irregular and legacy schedules exactly', () => {
    for (const process of [DEFAULT_SOURDOUGH_PROCESS, { ...authored, folds: [{ id: 'a', atMinutes: 40 }, { id: 'b', atMinutes: 55, method: 'lamination' as const }, { id: 'c', atMinutes: 100 }, { id: 'd', atMinutes: 110 }] }]) {
      const expected = process.folds.map((fold) => ({ ...fold, method: fold.method ?? process.foldMethod }))
      assert.deepEqual(foldsFromGroups(process.saltDelayMinutes, foldGroups(process), () => 'new'), expected)
    }
  })
  it('moves folds with salt and mints identities only for added sets', () => {
    const plan = foldGroups(authored)
    plan.groups[1].count = 4
    const folds = foldsFromGroups(0, plan, () => 'fold-new')
    assert.deepEqual(folds.map((fold) => fold.atMinutes), [20, 35, 50, 80, 110, 140, 170])
    assert.equal(folds.at(-1)!.id, 'fold-new')
    assert.deepEqual(foldGroups({ ...authored, folds: [] }), { startMinutes: 30, groups: [] })
  })
  it('parses durations', () => {
    for (const [text, minutes] of [['90', 90], ['1:30', 90], ['1:30h', 90], ['1h30', 90], ['1h 30m', 90], ['2h', 120], ['45m', 45], ['45 min', 45], ['0', 0]] as const) assert.equal(parseDuration(text), minutes, text)
    for (const text of ['', '1:75', 'soon', '1.5h', '-5']) assert.equal(parseDuration(text), null, text)
  })
})
