import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runRelease } from './release.mjs'

class Store {
  objects = new Map(); sequence = 0
  async read(key) { return structuredClone(this.objects.get(key) ?? null) }
  async write(key, value, condition = {}) {
    const old = this.objects.get(key)
    if ((condition.IfNoneMatch && old) || (condition.IfMatch && old?.etag !== condition.IfMatch)) throw new Error('Precondition failed')
    const etag = String(++this.sequence); this.objects.set(key, { value: structuredClone(value), etag }); return etag
  }
  async remove(key, etag) { assert.equal(this.objects.get(key)?.etag, etag); this.objects.delete(key) }
  async upload() {}
}
async function fixture(run) {
  const original = process.cwd(), directory = mkdtempSync(join(tmpdir(), 'eatyeet-release-test-'))
  process.chdir(directory)
  const operations = new Store(), stateStore = new Store(), events = []
  const revision = 'a'.repeat(40)
  await stateStore.write(`acceptance/staging/${revision}.json`, { restoreVerified: true, accessVerified: true, performanceVerified: true })
  const context = {
    config: { environment: 'production', origin: 'https://eatyeet.com' }, credentials: { RELEASE_VERIFY_SECRET: 'fixture-only-secret-longer-than-32' },
    stateStore, outputs: { operationsBucket: 'ops', mediaBucket: 'media', workerName: 'app' },
    revision: () => revision, migrations: () => ({}), storeFor: () => operations, sleep: async () => {},
    build: async ({ directory }) => {
      events.push('build'); mkdirSync(directory, { recursive: true }); mkdirSync('dist', { recursive: true })
      writeFileSync('dist/content-prepared.json', JSON.stringify({ images: [] }))
      const bundleFile = join(directory, 'worker.js'); writeFileSync(bundleFile, 'export default {}')
      return { bundleFile, assetsDirectory: directory }
    },
    infrastructure: async () => ({ exportStack: async () => ({}), setConfig: async () => {}, preview: async () => {}, up: async () => { events.push('application') } }),
    saveOutputs: async () => {}, backup: async () => { events.push('backup'); return { key: 'backup' } },
    uploadAssets: async () => { events.push('upload'); return { jwt: 'fixture-receipt', manifest: {} } },
    command: async (program, args) => {
      if (program === 'node') { events.push('verify'); return }
      const action = args[3]; events.push(action)
      if (action !== 'plan') assert.equal((await operations.read('control.json')).value.status, 'maintenance')
      if (action === 'plan') writeFileSync('dist/content-plan.json', JSON.stringify({ counts: { created: 0, updated: 0, retired: 0 }, siteChanged: false, mediaChanges: 0 }))
    },
  }
  try { await run({ context, operations, stateStore, events }) }
  finally { process.chdir(original); rmSync(directory, { recursive: true, force: true }) }
}
test('release uploads before mutation and opens traffic only after convergence and verification', async () => fixture(async ({ context, operations, stateStore, events }) => {
  await runRelease(context)
  assert.deepEqual(events, ['build','backup','upload','migrate','plan','sync','plan','application','verify'])
  assert.equal((await operations.read('control.json')).value.status, 'ready')
  assert.equal(await stateStore.read('locks/production.json'), null)
}))
test('failed upload preserves previous public state and retains the release lock', async () => fixture(async ({ context, operations, stateStore }) => {
  const before = { status: 'ready', generation: 'old', releaseId: 'old', contentRevision: 'b'.repeat(40), migrations: {} }
  await operations.write('control.json', before)
  context.uploadAssets = async () => { throw new Error('Upload unavailable') }
  await assert.rejects(runRelease(context), /failed at upload/)
  assert.deepEqual((await operations.read('control.json')).value, before)
  assert.ok(await stateStore.read('locks/production.json'))
}))
test('partial sync failure remains in maintenance and resumes using the original backup', async () => fixture(async ({ context, operations, stateStore, events }) => {
  const command = context.command
  context.command = async (program, args) => { if (args[3] === 'sync') throw new Error('Interrupted sync'); return command(program,args) }
  await assert.rejects(runRelease(context), /failed at sync/)
  assert.equal((await operations.read('control.json')).value.status, 'maintenance')
  const held = await stateStore.read('locks/production.json')
  await stateStore.remove('locks/production.json', held.etag) // Represents completed explicit writer recovery.
  context.command = command
  await runRelease(context, { resume: held.value.releaseId })
  assert.equal(events.filter((event) => event === 'backup').length, 1)
  assert.equal((await operations.read('control.json')).value.status, 'ready')
}))
test('failed health verification never reopens public traffic', async () => fixture(async ({ context, operations }) => {
  const command = context.command
  context.command = async (program,args) => { if (program === 'node') throw new Error('Broken chunks'); return command(program,args) }
  await assert.rejects(runRelease(context), /failed at verify/)
  assert.equal((await operations.read('control.json')).value.status, 'maintenance')
}))
test('application rollback preserves synchronized content and does not run migrations or sync', async () => fixture(async ({ context, operations, events }) => {
  await runRelease(context)
  const before = (await operations.read('control.json')).value
  events.length = 0
  await runRelease(context, { rollback: before.releaseId })
  assert.ok(!events.includes('migrate') && !events.includes('sync'))
  assert.equal((await operations.read('control.json')).value.contentRevision, before.contentRevision)
}))

test('migration failure keeps maintenance and never synchronizes or deploys', async () => fixture(async ({ context, operations, events }) => {
  const command = context.command
  context.command = async (program, args) => { if (args[3] === 'migrate') throw new Error('Migration failed'); return command(program,args) }
  await assert.rejects(runRelease(context), /failed at migrate/)
  assert.equal((await operations.read('control.json')).value.status, 'maintenance')
  assert.ok(!events.includes('sync') && !events.includes('application'))
}))
