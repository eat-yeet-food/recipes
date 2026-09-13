import { ObjectStore } from './storage.mjs'
import { ReleaseLock } from './lock.mjs'
import { ownerAccessSession } from './access-session.mjs'
import { probeToken } from './release.mjs'
import { cleanRevision, migrationManifest, digest, command } from './process.mjs'

export function assertVerificationState(record, control, outputs, migrations) {
  if (!record || record.phase !== 'verify' || !['failed', 'running'].includes(record.status)) throw new Error('Only an interrupted verification phase can be completed without deployment')
  if (control?.status !== 'maintenance' || control.releaseId !== record.id || control.contentRevision !== record.revision || outputs.releaseId !== record.id) throw new Error('Application, content and maintenance identities must match the interrupted release')
  if (JSON.stringify(control.migrations) !== JSON.stringify(record.migrations) || JSON.stringify(migrations) !== JSON.stringify(record.migrations)) throw new Error('Verification tooling migrations differ from the deployed release')
  if (!record.bundleHash || !record.backup || !record.assetManifest || typeof record.bundle !== 'string' || digest(record.bundle) !== record.bundleHash) throw new Error('Release recovery evidence is incomplete or corrupted')
}

export async function verifyDeployedBundle(config, credentials, outputs, record, request = fetch) {
  const response = await request(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts/${outputs.workerName}`, {
    headers: { Authorization: `Bearer ${credentials.CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(120000),
  })
  if (!response.ok || !response.headers.get('content-type')?.includes('multipart/form-data')) throw new Error('Unable to verify deployed Worker source')
  const parts = [...(await response.formData()).entries()]
  if (parts.length !== 1 || parts[0][0] !== 'worker.js') throw new Error('Unexpected deployed Worker modules')
  // Cloudflare may omit a filename on the multipart field, which makes the
  // platform parser return source text rather than a File object.
  const value = parts[0][1]
  const bytes = typeof value === 'string' ? Buffer.from(value) : Buffer.from(await value.arrayBuffer())
  if (typeof record.bundle !== 'string' || digest(record.bundle) !== record.bundleHash) throw new Error('Recorded Worker source is corrupted')
  const actualHash = digest(bytes)
  // Terraform's cty strings normalize to NFC. The pinned bridged provider uses
  // a string content input, so verify that exact transport transformation as
  // well as the raw source. Never use a loose text/whitespace comparison.
  const normalization = actualHash === record.bundleHash ? null : 'NFC'
  if (normalization && actualHash !== digest(record.bundle.normalize('NFC'))) throw new Error('Deployed Worker differs from recorded release')
  return { bundleHash: actualHash, normalization }
}

export async function verifyRelease(context, releaseId) {
  const { config, credentials, stateStore, client, outputs } = context
  if (!/^[a-zA-Z0-9_-]+$/.test(releaseId ?? '')) throw new Error('A release ID is required')
  const verificationRevision = (context.revision ?? cleanRevision)()
  const operations = context.operations ?? new ObjectStore(client, outputs.operationsBucket)
  const record = (await operations.read(`releases/${releaseId}.json`))?.value
  const initial = (await operations.read('control.json'))?.value
  assertVerificationState(record, initial, outputs, (context.migrations ?? migrationManifest)())
  // Authentication is read-only and happens before taking a new writer lock.
  const session = config.environment === 'staging' ? await (context.accessSession ?? ownerAccessSession)(config.origin) : undefined
  const lock = new ReleaseLock(stateStore, config.environment)
  await lock.acquire(releaseId)
  const abort = new AbortController()
  lock.startHeartbeat((error) => abort.abort(error))
  try {
    await lock.checkpoint('verify')
    const held = await operations.read('control.json')
    if (JSON.stringify(held?.value) !== JSON.stringify(initial)) throw new Error('Remote state changed during authentication')
    const deployedSource = await (context.verifyBundle ?? verifyDeployedBundle)(config, credentials, outputs, record)
    await operations.write(`recovery/${releaseId}/${Date.now()}.json`, { record, control: held.value, verificationRevision }, { IfNoneMatch: '*' })
    await (context.command ?? command)('node', ['test/verify-prod.mjs', config.origin], {
      env: { EATYEET_EXPECTED_RELEASE: releaseId, EATYEET_EXPECTED_CONTENT_REVISION: record.revision,
        EATYEET_VERIFY_TOKEN: probeToken(credentials, releaseId, config.origin), EATYEET_MEDIA_ORIGIN: config.mediaOrigin,
        ...(session ? { EATYEET_ACCESS_TOKEN: session } : {}) }, signal: abort.signal,
    })
    await lock.assertOwner()
    const current = await operations.read('control.json')
    if (JSON.stringify(current?.value) !== JSON.stringify(initial)) throw new Error('Remote state changed during verification')
    await operations.write('control.json', { ...current.value, status: 'ready' }, { IfMatch: current.etag })
    await operations.write(`releases/${releaseId}.json`, { ...record, status: 'complete', phase: 'complete', maintenance: false,
      error: null, completedAt: new Date().toISOString(), verificationRevision, deployedSource })
    await lock.release()
    console.log(`Release verification complete; traffic reopened: ${config.origin}`)
  } catch (error) {
    await lock.stop()
    throw new Error(`Verification did not complete; lock retained. Inspect release status before recovery. ${error.message}`)
  }
}
