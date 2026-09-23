import test from 'node:test'
import assert from 'node:assert/strict'
import { performancePassed, assertAcceptanceRelease } from './acceptance-policy.mjs'

const revision = 'a'.repeat(40)

test('new acceptance tooling can verify the deployed commit only with matching live release and migrations', () => {
  const record = { revision, id: 'release', status: 'complete', migrations: { initial: 'hash' } }
  const control = { contentRevision: revision, releaseId: record.id, status: 'ready', migrations: record.migrations }
  const outputs = { releaseId: record.id }
  assert.doesNotThrow(() => assertAcceptanceRelease(record, control, outputs, revision, record.migrations))
  assert.throws(() => assertAcceptanceRelease(record, control, outputs, 'b'.repeat(40), record.migrations), /matching/)
  assert.throws(() => assertAcceptanceRelease(record, { ...control, status: 'maintenance' }, outputs, revision, record.migrations), /matching/)
  assert.throws(() => assertAcceptanceRelease(record, control, { releaseId: 'other' }, revision, record.migrations), /matching/)
  assert.throws(() => assertAcceptanceRelease(record, control, outputs, revision, {}), /migrations/)
})
test('performance evidence validates all measured medians and rejects incomplete results', () => {
  const origin = 'https://staging.eatyeet.com'
  const report = { origin, results: ['/', '/recipes', '/browse', '/learn', '/recipes/new-york-style-pizza', '/learn/mixing-dough-and-gluten-development'].map((path) => ({ path,
    runs: [2000, 2200, 4000].map((lcp) => ({ performance: 0.95, lcp, cls: 0.01 })), median: { performance: 1, lcp: 1, cls: 0 } })) }
  assert.equal(performancePassed(report, origin), true)
  report.results[0].runs[1].lcp = 3000
  assert.equal(performancePassed(report, origin), false)
  report.results[0].runs.pop()
  assert.throws(() => performancePassed(report, origin), /Incomplete/)
  assert.throws(() => performancePassed(report, 'https://eatyeet.com'), /Incomplete/)
})
