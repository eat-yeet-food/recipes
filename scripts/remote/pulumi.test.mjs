import test from 'node:test'
import assert from 'node:assert/strict'
import { assertInitialProvisioningResume } from './pulumi.mjs'

const empty = { deployment: { resources: [] } }
const worker = (release) => ({ deployment: { resources: [{ type: 'cloudflare:index/workersScript:WorkersScript', inputs: { bindings: [{ name: 'RELEASE_ID', text: release }] } }] } })

test('initial provisioning resumes partial resources only with its original empty-stack backup', () => {
  assert.doesNotThrow(() => assertInitialProvisioningResume(worker('uninitialized'), empty, null))
  assert.throws(() => assertInitialProvisioningResume(empty, undefined, null), /original empty-stack/)
  assert.throws(() => assertInitialProvisioningResume(empty, { deployment: { resources: [{}, {}] } }, null), /original empty-stack/)
})

test('initial provisioning cannot resume after content release or application initialization', () => {
  assert.throws(() => assertInitialProvisioningResume(worker('uninitialized'), empty, { value: { status: 'maintenance' } }), /content release/)
  assert.throws(() => assertInitialProvisioningResume(worker('release-1'), empty, null), /initialized application/)
  assert.throws(() => assertInitialProvisioningResume(worker(undefined), empty, null), /initialized application/)
})
