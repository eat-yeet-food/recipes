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
    if (key === 'control.json') assert.equal(value.status, 'ready', 'releases must never close traffic')
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
  await stateStore.write(`acceptance/staging/${revision}.json`, { revision, restoreVerified: true, accessVerified: true, performanceVerified: true, ownerReviewed: true })
  const previous = { status: 'ready', generation: 'old', releaseId: 'old', contentRevision: 'b'.repeat(40), migrations: {} }
  await operations.write('control.json', previous)
  await operations.write('releases/old.json', { id: 'old', status: 'complete', migrations: {}, bundle: 'export default {}', assetManifest: {} })
  let changed = false
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
    archiveAssets: async () => { events.push('archive'); return {} },
    command: async (program, args) => {
      if (program === 'node') { events.push('verify'); return }
      const action = args[3]; events.push(action)
      if (action === 'sync') changed = false
      if (action === 'plan') writeFileSync('dist/content-plan.json', JSON.stringify({ status: 'complete', counts: { created: 0, updated: changed ? 1 : 0, retired: 0 }, siteChanged: false, mediaChanges: 0 }))
    },
  }
  try { await run({ context, operations, stateStore, events, previous, changeContent: () => { changed = true } }) }
  finally { process.chdir(original); rmSync(directory, { recursive: true, force: true }) }
}
test('normal unchanged deploy is automatically fast and never enters maintenance', async () => fixture(async ({ context, operations, stateStore, events }) => {
  await runRelease(context)
  assert.deepEqual(events, ['build', 'plan', 'archive', 'application', 'verify'])
  const control = (await operations.read('control.json')).value
  assert.equal(control.status, 'ready')
  assert.equal((await operations.read(`releases/${control.releaseId}.json`)).value.dataChanges, false)
  assert.equal(await stateStore.read('locks/production.json'), null)
}))

test('production deploy does not require manual acceptance, performance exceptions or restore drills', async () => fixture(async ({ context, stateStore }) => {
  stateStore.objects.clear()
  await runRelease(context)
}))

test('staging authenticates once before builds and locks and reuses the session', async () => fixture(async ({ context, operations, stateStore, events, previous }) => {
  context.config = { environment: 'staging', origin: 'https://staging.eatyeet.com' }
  context.accessSession = async () => {
    assert.equal(await stateStore.read('locks/staging.json'), null)
    assert.deepEqual((await operations.read('control.json')).value, previous)
    events.push('auth'); return 'private-test-session'
  }
  const command = context.command
  context.command = async (program, args, options) => {
    if (program === 'node') assert.equal(options.env.EATYEET_ACCESS_TOKEN, 'private-test-session')
    return command(program, args, options)
  }
  await runRelease(context)
  assert.deepEqual(events, ['auth', 'build', 'plan', 'archive', 'application', 'verify'])
}))

test('failed authentication leaves serving state untouched and never locks', async () => fixture(async ({ context, operations, stateStore, previous, events }) => {
  context.config.environment = 'staging'
  context.accessSession = async () => { throw new Error('login failed') }
  await assert.rejects(runRelease(context), /login failed/)
  assert.deepEqual((await operations.read('control.json')).value, previous)
  assert.equal(await stateStore.read('locks/staging.json'), null)
  assert.deepEqual(events, [])
}))

test('content changes get a backup and atomic sync while old application keeps serving', async () => fixture(async ({ context, operations, events, changeContent }) => {
  changeContent()
  const command = context.command
  context.command = async (program, args, options) => {
    if (args[3] === 'sync') {
      assert.equal(options.env.EATYEET_ATOMIC_CONTENT, '1')
      assert.equal(options.env.EATYEET_MEDIA_PREUPLOADED, '1')
      assert.equal((await operations.read('control.json')).value.releaseId, 'old')
    }
    return command(program, args, options)
  }
  await runRelease(context)
  assert.deepEqual(events, ['build', 'plan', 'backup', 'archive', 'sync', 'plan', 'application', 'verify'])
}))

test('partial content failure keeps traffic open, changes cache generation, and resumes original backup', async () => fixture(async ({ context, operations, stateStore, events, changeContent }) => {
  changeContent()
  const command = context.command
  context.command = async (program, args, options) => {
    if (args[3] === 'sync') throw new Error('D1 interrupted')
    return command(program, args, options)
  }
  await assert.rejects(runRelease(context), /failed at sync/)
  const failed = (await operations.read('control.json')).value
  assert.equal(failed.status, 'ready'); assert.notEqual(failed.generation, 'old')
  const held = await stateStore.read('locks/production.json')
  await stateStore.remove('locks/production.json', held.etag)
  context.command = command
  await runRelease(context, { resume: held.value.releaseId })
  assert.equal(events.filter((event) => event === 'backup').length, 1)
}))

test('failed application health restores prior bundle, preserves live data and releases lock', async () => fixture(async ({ context, operations, stateStore, events }) => {
  const command = context.command
  context.command = async (program, args, options) => {
    if (program === 'node' && options.env.EATYEET_EXPECTED_RELEASE !== 'old') throw new Error('Broken app')
    return command(program, args, options)
  }
  await assert.rejects(runRelease(context), /Previous application restored/)
  const control = (await operations.read('control.json')).value
  assert.equal(control.releaseId, 'old'); assert.equal(control.status, 'ready')
  assert.equal(control.contentRevision, context.revision())
  assert.equal(events.filter((event) => event === 'application').length, 2)
  assert.equal(await stateStore.read('locks/production.json'), null)
}))

test('failed rollback health retains ownership and never pretends recovery succeeded', async () => fixture(async ({ context, operations, stateStore }) => {
  context.command = async (program) => { if (program === 'node') throw new Error('Unhealthy')
    writeFileSync('dist/content-plan.json', JSON.stringify({ status: 'complete', counts: { created: 0, updated: 0, retired: 0 }, siteChanged: false, mediaChanges: 0 })) }
  await assert.rejects(runRelease(context), /Lock retained/)
  assert.equal((await operations.read('control.json')).value.status, 'ready')
  assert.ok(await stateStore.read('locks/production.json'))
}))

test('failed asset archive preserves public state and permits a direct retry without lock recovery', async () => fixture(async ({ context, operations, stateStore, previous, events }) => {
  context.archiveAssets = async () => { throw new Error('Archive failure') }
  await assert.rejects(runRelease(context), /failed at upload/)
  assert.deepEqual((await operations.read('control.json')).value, previous)
  assert.ok(!events.includes('application'))
  assert.equal(await stateStore.read('locks/production.json'), null)
}))

test('explicit code-only remains an assertion against content drift', async () => fixture(async ({ context, operations, previous, changeContent }) => {
  changeContent()
  await assert.rejects(runRelease(context, { codeOnly: true }), /unchanged content/)
  assert.deepEqual((await operations.read('control.json')).value, previous)
}))

test('application rollback is online and never synchronizes shared data', async () => fixture(async ({ context, operations, events, previous }) => {
  await runRelease(context, { rollback: 'old' })
  assert.ok(!events.includes('sync') && !events.includes('migrate') && !events.includes('backup'))
  assert.equal((await operations.read('control.json')).value.contentRevision, previous.contentRevision)
}))

test('new schema must explicitly support online old/new application coexistence before building', async () => fixture(async ({ context, events }) => {
  mkdirSync('packages/l8/web/migrations', { recursive: true })
  writeFileSync('packages/l8/web/migrations/20260923_example.ts', 'export async function up() {}')
  context.migrations = () => ({ '20260923_example.ts': 'new' })
  await assert.rejects(runRelease(context), /onlineCompatible/)
  assert.deepEqual(events, [])
  writeFileSync('packages/l8/web/migrations/20260923_example.ts', 'export const onlineCompatible = true; export async function up() {}')
  await runRelease(context)
  assert.ok(events.includes('migrate') && events.includes('backup'))
}))

test('resume preserves the explicit code-only assertion', async () => fixture(async ({ context, operations, stateStore, changeContent }) => {
  const up = context.infrastructure
  context.infrastructure = async () => ({ ...(await up()), up: async () => { throw new Error('deployment interrupted') } })
  await assert.rejects(runRelease(context, { codeOnly: true }), /failed at application/)
  const held = await stateStore.read('locks/production.json')
  await stateStore.remove('locks/production.json', held.etag)
  context.infrastructure = up
  changeContent()
  await assert.rejects(runRelease(context, { resume: held.value.releaseId, codeOnly: true }), /unchanged content/)
  assert.equal((await operations.read('control.json')).value.status, 'ready')
}))
