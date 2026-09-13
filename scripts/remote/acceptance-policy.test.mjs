import test from 'node:test'
import assert from 'node:assert/strict'
import { performancePassed, acceptanceException, assertProductionAcceptance, assertAcceptanceRelease } from './acceptance-policy.mjs'

const revision = 'a'.repeat(40), owner = 'owner@example.test', now = 1800000000000

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
const approved = () => ({ revision, restoreVerified: true, accessVerified: true, performanceVerified: false, ownerReviewed: false,
  exception: acceptanceException('Owner explicitly requested deployment with reported performance and pending admin review.', revision, owner, ['performance', 'owner-review'], now) })

test('owner exception permits only the recorded commit and limitations within one day', () => {
  assert.doesNotThrow(() => assertProductionAcceptance(approved(), revision, owner, now))
  assert.throws(() => assertProductionAcceptance(approved(), 'b'.repeat(40), owner, now), /exact-commit/)
  assert.throws(() => assertProductionAcceptance(approved(), revision, 'other@example.test', now), /owner exception/)
  assert.throws(() => assertProductionAcceptance(approved(), revision, owner, now + 86400001), /owner exception/)
  for (const property of ['restoreVerified', 'accessVerified']) {
    assert.throws(() => assertProductionAcceptance({ ...approved(), [property]: false }, revision, owner, now), /cannot be excepted/)
  }
  const evidence = approved(); evidence.exception.limitations = ['performance']
  assert.throws(() => assertProductionAcceptance(evidence, revision, owner, now), /owner exception/)
})

test('passing acceptance needs no exception; missing review never implicitly passes', () => {
  const evidence = { revision, restoreVerified: true, accessVerified: true, performanceVerified: true, ownerReviewed: true }
  assert.doesNotThrow(() => assertProductionAcceptance(evidence, revision, owner, now))
  delete evidence.ownerReviewed
  assert.throws(() => assertProductionAcceptance(evidence, revision, owner, now), /owner exception/)
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
