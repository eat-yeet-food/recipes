import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { createHmac, randomUUID } from 'node:crypto'
import { ReleaseLock } from './lock.mjs'
import { ObjectStore } from './storage.mjs'
import { infrastructure, saveOutputs } from './pulumi.mjs'
import { uploadAssets, archiveAssets, restoreAssets } from './assets.mjs'
import { command, cleanRevision, migrationManifest, assertCompatible, digest } from './process.mjs'
import { databaseBackup } from './backups.mjs'
import { ownerAccessSession } from './access-session.mjs'

export function probeToken(credentials, releaseId, origin) {
  const body = Buffer.from(JSON.stringify({ releaseId, origin, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')
  return `${body}.${createHmac('sha256', credentials.RELEASE_VERIFY_SECRET).update(body).digest('base64url')}`
}
async function buildArtifacts({ directory, outputs, childEnv, abort, child, rollback, command }) {
  // Builds and source preparation happen before acquiring the remote writer lock.
  if (!rollback) await child('prepare')
  await command('pnpm', ['run', 'build:worker'], { signal: abort.signal })
  const buildConfig = resolve(directory, 'wrangler-build.json')
  writeFileSync(buildConfig, JSON.stringify({ name: outputs.workerName, main: resolve('packages/l8/web/worker.mjs'), compatibility_date: '2026-09-12', compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'], workers_dev: false, preview_urls: false }), { mode: 0o600 })
  const bundleDirectory = resolve(directory, 'bundle')
  await command('pnpm', ['exec', 'wrangler', 'deploy', '--dry-run', '--config', buildConfig, '--outdir', bundleDirectory], { env: childEnv, signal: abort.signal })
  const modules = readdirSync(bundleDirectory).filter((name) => !name.endsWith('.map') && !name.startsWith('README'))
  if (modules.length !== 1 || !/\.(m?js)$/.test(modules[0])) throw new Error('Worker produced additional modules; do not deploy an incomplete bundle')
  const bundleFile = resolve(bundleDirectory, modules[0])
  const assetsDirectory = resolve(directory, 'assets')
  cpSync(resolve('packages/l8/web/.open-next/assets'), assetsDirectory, { recursive: true })
  return { bundleFile, assetsDirectory }
}
export async function runRelease(context, { resume, rollback } = {}) {
  const { config, credentials, stateStore, client, api, outputs } = context
  const run = context.command ?? command
  const storeFor = context.storeFor ?? ((bucket) => new ObjectStore(client, bucket))
  const revision = (context.revision ?? cleanRevision)()
  const operations = storeFor(outputs.operationsBucket)
  let previous = (await operations.read('control.json'))?.value
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
  if (resume) previous = record.previous
  const migrations = (context.migrations ?? migrationManifest)()
  assertCompatible(previous?.migrations, migrations)
  const rollbackRecord = rollback ? (await operations.read(`releases/${rollback}.json`))?.value : null
  if (rollback && (!rollbackRecord || rollbackRecord.status !== 'complete' || JSON.stringify(rollbackRecord.migrations) !== JSON.stringify(previous?.migrations))) throw new Error('Application rollback requires a completed release with the currently applied migration set')
  if (config.environment === 'production' && !rollback && !resume) {
    const evidence = (await stateStore.read(`acceptance/staging/${revision}.json`))?.value
    if (!evidence?.restoreVerified || !evidence?.accessVerified || !evidence?.performanceVerified) throw new Error('Production requires staging acceptance for this exact commit, including restore, Access/MFA and performance')
  }
  const { bundleFile, assetsDirectory } = await (context.build ?? buildArtifacts)({ directory, outputs, childEnv, abort, child, rollback, command: run })
  if ((context.revision ?? cleanRevision)() !== revision) throw new Error('Source commit changed during the build')
  await lock.acquire(releaseId)
  childEnv.EATYEET_RELEASE_LOCK = lock.value.token
  lock.startHeartbeat((error) => abort.abort(error))
  record = { ...record, id: releaseId, revision, migrations, previous, startedAt: record?.startedAt ?? new Date().toISOString(), status: 'running', phase: 'prepared' }
  const phase = async (name) => {
    await lock.checkpoint(name)
    record.phase = name
    await operations.write(`releases/${releaseId}.json`, record)
    console.log(`Release ${releaseId}: ${name}`)
  }
  let maintenance = false
  try {
    const current = (await operations.read('control.json'))?.value
    if (!resume && JSON.stringify(current) !== JSON.stringify(previous)) throw new Error('Remote content changed while building; replan the release')
    const stack = await (context.infrastructure ?? infrastructure)(config, credentials)
    if (previous && !rollback) {
      await phase('plan')
      await child('plan')
      record.contentPlan = JSON.parse(readFileSync('dist/content-plan.json', 'utf8'))
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
    if (!record.backup) record.backup = await (context.backup ?? databaseBackup)(api, config, outputs, operations, credentials, releaseId)
    await phase('upload')
    const prepared = rollback ? { images: [] } : JSON.parse(readFileSync('dist/content-prepared.json', 'utf8'))
    const media = storeFor(outputs.mediaBucket)
    for (const { manifest } of prepared.images) for (const variant of [...manifest.variants, manifest.social]) {
      await lock.assertOwner()
      await media.upload(variant.key, readFileSync(resolve('.local/remote', config.environment, 'images', manifest.hash, basename(variant.key))), `image/${variant.format}`)
    }
    if (rollbackRecord) {
      await restoreAssets(operations, rollbackRecord.assetManifest, assetsDirectory)
      writeFileSync(bundleFile, rollbackRecord.bundle, { mode: 0o600 })
    }
    const previousRecord = previous?.releaseId ? (await operations.read(`releases/${previous.releaseId}.json`))?.value : null
    await restoreAssets(operations, previousRecord?.assetManifest, assetsDirectory, { retainStaticOnly: true })
    await archiveAssets(operations, assetsDirectory)
    const assetReceipt = await (context.uploadAssets ?? uploadAssets)(api, config.accountId, outputs.workerName, assetsDirectory)
    record.assetManifest = assetReceipt.manifest
    record.bundleHash = digest(readFileSync(bundleFile))
    record.bundle = readFileSync(bundleFile, 'utf8')
    record.assetsDirectory = assetsDirectory
    await phase('maintenance')
    const control = { releaseId, contentRevision: rollback ? previous.contentRevision : revision, generation: randomUUID(), status: 'maintenance', migrations }
    await operations.write('control.json', control)
    maintenance = true
    await (context.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(35000)
    if (!rollback) {
      await phase('migrate')
      await child('migrate')
      await phase('plan')
      await child('plan')
      record.contentPlan = JSON.parse(readFileSync('dist/content-plan.json', 'utf8'))
      await phase('sync')
      await child('sync')
      await child('plan')
      const convergence = JSON.parse(readFileSync('dist/content-plan.json', 'utf8'))
      if (convergence.counts.created || convergence.counts.updated || convergence.counts.retired || convergence.siteChanged || convergence.mediaChanges) throw new Error('Content did not converge after synchronization')
    }
    await phase('application')
    await stack.setConfig('eatyeet:assetsJwt', { value: assetReceipt.jwt, secret: true })
    await stack.setConfig('eatyeet:release', { value: JSON.stringify({ id: releaseId, bundleFile, bundleHash: record.bundleHash }) })
    await lock.assertOwner()
    if (config.environment === 'production' && config.cutover && !previous) {
      const pages = (await api(`/accounts/${config.accountId}/pages/projects`)).result
      for (const project of pages.filter((project) => project.domains?.includes('eatyeet.com') && project.source?.config?.production_deployments_enabled)) {
        await operations.write(`cutover/${releaseId}/pages.json`, { project: project.name, productionDeploymentsEnabled: true })
        await api(`/accounts/${config.accountId}/pages/projects/${project.name}`, { method: 'PATCH', body: JSON.stringify({ source: { ...project.source, config: { ...project.source.config, production_deployments_enabled: false } } }) })
      }
    }
    await stack.preview({ onOutput: console.log })
    await stack.up({ onOutput: console.log })
    await (context.saveOutputs ?? saveOutputs)(stack, config.environment)
    await phase('verify')
    const accessSession = config.environment === 'staging' ? await (context.accessSession ?? ownerAccessSession)(config.origin) : undefined
    const token = probeToken(credentials, releaseId, config.origin)
    await run('node', ['test/verify-prod.mjs', config.origin], { env: { EATYEET_EXPECTED_RELEASE: releaseId, EATYEET_VERIFY_TOKEN: token, EATYEET_MEDIA_ORIGIN: config.mediaOrigin, ...(accessSession ? { EATYEET_ACCESS_TOKEN: accessSession } : {}) }, signal: abort.signal })
    await lock.assertOwner()
    await operations.write('control.json', { ...control, status: 'ready' })
    maintenance = false
    record.status = 'complete'; record.completedAt = new Date().toISOString()
    await phase('complete')
    await lock.release()
    console.log(`Release complete: ${config.origin} (${releaseId})`)
  } catch (error) {
    record.status = 'failed'; record.error = error.message; record.maintenance = maintenance
    await lock.assertOwner().then(() => operations.write(`releases/${releaseId}.json`, record)).catch(() => {})
    await lock.stop()
    throw new Error(`Release ${releaseId} failed at ${record.phase}. Lock retained; ${maintenance ? 'maintenance remains active' : 'inspect release status before recovery'}. ${error.message}`)
  }
}
