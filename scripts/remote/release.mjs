import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { createHmac, randomUUID } from 'node:crypto'
import { ReleaseLock } from './lock.mjs'
import { ObjectStore } from './storage.mjs'
import { infrastructure, saveOutputs } from './pulumi.mjs'
import { archiveAssets, restoreAssets } from './assets.mjs'
import { command, cleanRevision, migrationManifest, assertCompatible, digest } from './process.mjs'
import { recoveryBookmark } from './backups.mjs'
import { ownerAccessSession } from './access-session.mjs'
import { deploymentManifest } from '../../infra/cloudflare/assets.cjs'
import { assertCodeOnly } from './code-only.mjs'
import { concurrent } from './concurrency.mjs'
import { cachedBuild } from './build-cache.mjs'

export function probeToken(credentials, releaseId, origin) {
  const body = Buffer.from(JSON.stringify({ releaseId, origin, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')
  return `${body}.${createHmac('sha256', credentials.RELEASE_VERIFY_SECRET).update(body).digest('base64url')}`
}
async function buildArtifacts({ directory, outputs, childEnv, abort, child, rollback, command, revision }) {
  // Builds and source preparation happen before acquiring the remote writer lock.
  if (rollback) {
    const bundleFile = resolve(directory, 'worker.js'), assetsDirectory = resolve(directory, 'assets')
    mkdirSync(assetsDirectory, { recursive: true })
    return { bundleFile, assetsDirectory }
  }
  await child('prepare')
  return cachedBuild(revision, directory, async () => {
    await command('pnpm', ['run', 'build:worker'], { signal: abort.signal })
    const buildConfig = resolve(directory, 'wrangler-build.json')
    writeFileSync(buildConfig, JSON.stringify({ name: outputs.workerName, main: resolve('packages/l8/web/worker.mjs'), compatibility_date: '2026-09-12', compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'], workers_dev: false, preview_urls: false }), { mode: 0o600 })
    const bundleDirectory = resolve(directory, 'bundle')
    await command('pnpm', ['exec', 'wrangler', 'deploy', '--dry-run', '--config', buildConfig, '--outdir', bundleDirectory], { env: childEnv, signal: abort.signal })
    const modules = readdirSync(bundleDirectory).filter((name) => !name.endsWith('.map') && !name.startsWith('README'))
    if (modules.length !== 1 || !/\.(m?js)$/.test(modules[0])) throw new Error('Worker produced additional modules; do not deploy an incomplete bundle')
    const bundleFile = resolve(bundleDirectory, modules[0])
    const assetsDirectory = resolve(directory, 'assets')
    cpSync(resolve('packages/l8/web/.open-next/assets'), assetsDirectory, { recursive: true, filter: (source) => !source.endsWith('.map') })
    if (cleanRevision() !== revision) throw new Error('Source commit changed during the build; refusing to cache artifacts')
    return { bundleFile, assetsDirectory }
  })
}
export async function runRelease(context, { resume, rollback, codeOnly = false } = {}) {
  const { config, credentials, stateStore, client, api, outputs } = context
  const run = context.command ?? command
  const storeFor = context.storeFor ?? ((bucket) => new ObjectStore(client, bucket))
  const revision = (context.revision ?? cleanRevision)()
  const operations = storeFor(outputs.operationsBucket)
  let previous = (await operations.read('control.json'))?.value
  if (previous && previous.status !== 'ready' && !resume) throw new Error('Recover the existing maintenance operation before deploying; normal releases keep traffic open')
  const releaseId = resume ?? `${revision.slice(0, 12)}-${Date.now()}`
  if (!/^[a-zA-Z0-9_-]+$/.test(releaseId)) throw new Error('Invalid release identity')
  const directory = resolve('.local/remote', config.environment, 'releases', releaseId)
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const lock = new ReleaseLock(stateStore, config.environment)
  const abort = new AbortController()
  const childEnv = { EATYEET_REMOTE_CHILD: config.environment, WRANGLER_LOG_PATH: resolve(directory, 'wrangler.log') }
  const child = (action) => run('pnpm', ['exec', 'tsx', 'scripts/content-cli.ts', action, '--env', config.environment], { env: childEnv, signal: abort.signal })
  let record = resume ? (await operations.read(`releases/${releaseId}.json`))?.value : null
  if (resume && (!record || record.revision !== revision)) throw new Error('Resume requires the original release commit')
  if (resume) {
    const assertion = record.codeOnly ?? record.mode === 'code-only'
    if (codeOnly && !assertion) throw new Error('Cannot change release mode during resume')
    codeOnly = assertion
  }
  if (resume) previous = record.previous
  const migrations = (context.migrations ?? migrationManifest)()
  assertCompatible(previous?.migrations, migrations)
  if (codeOnly) {
    if (rollback) throw new Error('Code-only mode cannot be combined with rollback')
    assertCodeOnly(previous, migrations)
  }
  const rollbackRecord = rollback ? (await operations.read(`releases/${rollback}.json`))?.value : null
  if (rollback && (!rollbackRecord || rollbackRecord.status !== 'complete' || JSON.stringify(rollbackRecord.migrations) !== JSON.stringify(previous?.migrations))) throw new Error('Application rollback requires a completed release with the currently applied migration set')
  // Complete interactive staging authentication before build work or the remote
  // writer lock; reuse the session during the final online health check.
  const accessSession = config.environment === 'staging' ? await (context.accessSession ?? ownerAccessSession)(config.origin) : undefined
  const buildStarted = Date.now()
  const { bundleFile, assetsDirectory } = await (context.build ?? buildArtifacts)({ directory, outputs, childEnv, abort, child, rollback, command: run, revision })
  const buildMs = Date.now() - buildStarted
  if ((context.revision ?? cleanRevision)() !== revision) throw new Error('Source commit changed during the build')
  await lock.acquire(releaseId)
  childEnv.EATYEET_RELEASE_LOCK = lock.value.token
  lock.startHeartbeat((error) => abort.abort(error))
  record = { ...record, id: releaseId, revision, migrations, previous, mode: 'online', codeOnly, startedAt: record?.startedAt ?? new Date().toISOString(), status: 'running', phase: 'prepared', timings: { build: buildMs } }
  let phaseStarted = Date.now()
  const phase = async (name) => {
    record.timings[record.phase] = (record.timings[record.phase] ?? 0) + Date.now() - phaseStarted
    phaseStarted = Date.now()
    await lock.checkpoint(name)
    record.phase = name
    await operations.write(`releases/${releaseId}.json`, record)
    console.log(`Release ${releaseId}: ${name}`)
  }
  let stack, control, previousRecord, contentStarted = false
  let dataMutationsStarted = Boolean(record.dataMutationsStarted), applicationStarted = false
  const schemaChanged = !previous || JSON.stringify(previous.migrations) !== JSON.stringify(migrations)
  const hasChanges = (plan) => {
    if (plan?.status !== 'complete' || !plan.counts || !['created', 'updated', 'retired'].every((key) => Number.isInteger(plan.counts[key]) && plan.counts[key] >= 0) || typeof plan.siteChanged !== 'boolean' || !Number.isInteger(plan.mediaChanges)) throw new Error('Incomplete content plan')
    return plan.counts.created > 0 || plan.counts.updated > 0 || plan.counts.retired > 0 || plan.siteChanged || plan.mediaChanges > 0
  }
  try {
    const current = (await operations.read('control.json'))?.value
    if (!resume && JSON.stringify(current) !== JSON.stringify(previous)) throw new Error('Remote content changed while building; replan the release')
    stack = await (context.infrastructure ?? infrastructure)(config, credentials)
    previousRecord = previous?.releaseId ? (await operations.read(`releases/${previous.releaseId}.json`))?.value : null
    if (previous && !rollback && !schemaChanged) {
      await phase('plan')
      await child('plan')
      record.contentPlan = JSON.parse(readFileSync('dist/content-plan.json', 'utf8'))
      if (codeOnly) assertCodeOnly(previous, migrations, record.contentPlan)
    }
    await phase('backup')
    if (config.environment === 'production' && config.cutover && !previous) {
      const observed = await (await import('./cloudflare.mjs')).inventory(api)
      if (observed.accountId !== config.accountId || observed.zoneId !== config.zoneId) throw new Error('Cutover inventory does not match configured ownership')
      const inventoryKey = `cutover/${releaseId}/inventory.json`
      if (!(await operations.read(inventoryKey))) await operations.write(inventoryKey, observed, { IfNoneMatch: '*' })
      const legacyProjects = observed.pages.filter((project) => project.domains?.includes('eatyeet.com')).map((project) => project.name)
      if (observed.deployHooks.some((hook) => legacyProjects.includes(hook.project))) throw new Error('Legacy production deploy hooks remain. Disable their callers and remove the hooks before cutover; the saved inventory records their identities.')
    }
    const state = await stack.exportStack()
    const stateBackupKey = `backups/${config.environment}/${releaseId}.json`
    if (!(await stateStore.read(stateBackupKey))) await stateStore.write(stateBackupKey, state, { IfNoneMatch: '*' })
    const dataChanges = !rollback && (schemaChanged || hasChanges(record.contentPlan))
    record.dataChanges = dataChanges
    if (dataChanges && !record.backup) record.backup = await (context.backup ?? recoveryBookmark)(api, config, outputs, operations, credentials, releaseId)
    await phase('upload')
    const prepared = rollback ? { images: [] } : JSON.parse(readFileSync('dist/content-prepared.json', 'utf8'))
    const media = storeFor(outputs.mediaBucket)
    const mediaObjects = [...new Map(prepared.images.flatMap(({ manifest }) => [...manifest.variants, manifest.social].map((variant) => ({
      key: variant.key, contentType: `image/${variant.format}`,
      bytes: () => readFileSync(resolve('.local/remote', config.environment, 'images', manifest.hash, basename(variant.key))),
    }))).map((object) => [object.key, object])).values()]
    const mediaReceipt = { uploaded: 0, reused: 0 }
    await concurrent(mediaObjects, async (object) => {
      await lock.assertOwner()
      const uploaded = await media.upload(object.key, object.bytes(), object.contentType)
      mediaReceipt[uploaded ? 'uploaded' : 'reused']++
    })
    record.media = mediaReceipt
    console.log(`Media: ${mediaReceipt.uploaded} uploaded, ${mediaReceipt.reused} reused`)
    await lock.assertOwner()
    if (rollbackRecord) {
      await restoreAssets(operations, rollbackRecord.assetManifest, assetsDirectory)
      writeFileSync(bundleFile, rollbackRecord.bundle, { mode: 0o600 })
    }
    await restoreAssets(operations, previousRecord?.assetManifest, assetsDirectory, { retainStaticOnly: true })
    // Pulumi's provider creates the upload session and transfers missing hashes.
    // Starting another session here only repeats that provider work.
    record.assetManifest = await (context.archiveAssets ?? archiveAssets)(operations, assetsDirectory)
    record.bundleHash = digest(readFileSync(bundleFile))
    record.bundle = readFileSync(bundleFile, 'utf8')
    record.assetsDirectory = assetsDirectory
    record.deploymentManifest = deploymentManifest(assetsDirectory)
    control = { releaseId, contentRevision: rollback ? previous.contentRevision : revision, generation: randomUUID(), status: 'ready', migrations }
    if (!rollback && schemaChanged) {
      dataMutationsStarted = record.dataMutationsStarted = true
      await phase('migrate')
      await child('migrate')
      await phase('plan')
      await child('plan')
      record.contentPlan = JSON.parse(readFileSync('dist/content-plan.json', 'utf8'))
    }
    if (!rollback && hasChanges(record.contentPlan)) {
      // Invalidate before and after sync. In-flight readers can finish on the
      // old generation, but cannot populate the completed content generation.
      contentStarted = true
      dataMutationsStarted = record.dataMutationsStarted = true
      if (previous) await operations.write('control.json', { ...previous, generation: randomUUID(), status: 'ready' })
      await phase('sync')
      childEnv.EATYEET_ATOMIC_CONTENT = '1'
      childEnv.EATYEET_MEDIA_PREUPLOADED = '1'
      await child('sync')
      await child('plan')
      const convergence = JSON.parse(readFileSync('dist/content-plan.json', 'utf8'))
      if (hasChanges(convergence)) throw new Error('Content did not converge after synchronization')
    }
    if (previous) await operations.write('control.json', { ...control, releaseId: previous.releaseId })
    await phase('application')
    await stack.setConfig('eatyeet:release', { value: JSON.stringify({ id: releaseId, bundleFile, bundleHash: record.bundleHash, assetsDirectory, deploymentManifest: record.deploymentManifest }) })
    await lock.assertOwner()
    if (config.environment === 'production' && config.cutover && !previous) {
      const pages = (await api(`/accounts/${config.accountId}/pages/projects`)).result
      for (const project of pages.filter((project) => project.domains?.includes('eatyeet.com') && project.source?.config?.production_deployments_enabled)) {
        await operations.write(`cutover/${releaseId}/pages.json`, { project: project.name, productionDeploymentsEnabled: true })
        await api(`/accounts/${config.accountId}/pages/projects/${project.name}`, { method: 'PATCH', body: JSON.stringify({ source: { ...project.source, config: { ...project.source.config, production_deployments_enabled: false } } }) })
      }
    }
    applicationStarted = true
    await stack.up({ onOutput: console.log })
    await (context.saveOutputs ?? saveOutputs)(stack, config.environment)
    await operations.write('control.json', control)
    await phase('verify')
    await run('node', ['scripts/remote/health.mjs', config.origin], { env: { EATYEET_EXPECTED_RELEASE: releaseId, EATYEET_EXPECTED_CONTENT_REVISION: control.contentRevision, ...(accessSession ? { EATYEET_ACCESS_TOKEN: accessSession } : {}) }, signal: abort.signal })
    await lock.assertOwner()
    record.status = 'complete'; record.completedAt = new Date().toISOString()
    await phase('complete')
    await lock.release()
    console.log(`Release complete: ${config.origin} (${releaseId})`)
    console.log('Phase timings (seconds): ' + Object.entries(record.timings).map(([name, ms]) => `${name}=${(ms / 1000).toFixed(1)}`).join(', '))
  } catch (error) {
    record.status = 'failed'; record.error = error.message; record.maintenance = false
    // A bad application can revert while the site continues serving. Shared
    // database writes are never rolled back: migrations must support both apps.
    if (record.phase === 'verify' && previousRecord?.bundle && previousRecord?.assetManifest) {
      try {
        await lock.assertOwner()
        const fallback = resolve(directory, 'fallback'), fallbackAssets = resolve(fallback, 'assets'), fallbackBundle = resolve(fallback, 'worker.js')
        mkdirSync(fallbackAssets, { recursive: true })
        await restoreAssets(operations, previousRecord.assetManifest, fallbackAssets)
        await restoreAssets(operations, record.assetManifest, fallbackAssets, { retainStaticOnly: true })
        writeFileSync(fallbackBundle, previousRecord.bundle, { mode: 0o600 })
        await stack.setConfig('eatyeet:release', { value: JSON.stringify({ id: previousRecord.id, bundleFile: fallbackBundle, bundleHash: digest(previousRecord.bundle), assetsDirectory: fallbackAssets, deploymentManifest: deploymentManifest(fallbackAssets) }) })
        await stack.up({ onOutput: console.log })
        await (context.saveOutputs ?? saveOutputs)(stack, config.environment)
        await operations.write('control.json', { ...control, releaseId: previousRecord.id, generation: randomUUID() })
        await run('node', ['scripts/remote/health.mjs', config.origin], { env: { EATYEET_EXPECTED_RELEASE: previousRecord.id, EATYEET_EXPECTED_CONTENT_REVISION: control.contentRevision, ...(accessSession ? { EATYEET_ACCESS_TOKEN: accessSession } : {}) } })
        record.revertedTo = previousRecord.id
      } catch (recoveryError) { record.recoveryError = recoveryError.message }
    } else if (contentStarted && record.phase !== 'application') {
      await lock.assertOwner().then(async () => {
        const current = (await operations.read('control.json'))?.value
        if (current) await operations.write('control.json', { ...current, generation: randomUUID() })
      }).catch(() => {})
    }
    await lock.assertOwner().then(() => operations.write(`releases/${releaseId}.json`, record)).catch(() => {})
    await lock.stop()
    const safeToUnlock = record.revertedTo || (!dataMutationsStarted && !applicationStarted)
    if (safeToUnlock) await lock.release()
    throw new Error(`Release ${releaseId} failed at ${record.phase}. ${record.revertedTo ? `Previous application restored (${record.revertedTo}); lock cleared.` : safeToUnlock ? 'Serving application unchanged; lock cleared, retry directly.' : 'Lock retained; inspect release status before recovery.'} No maintenance window was enabled. ${error.message}`)
  }
}
