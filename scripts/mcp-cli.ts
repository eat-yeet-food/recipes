/**
 * Operator commands for the owner's MCP connector and its trial recipes.
 *
 *   pnpm mcp token  [--env production]  mint an owner token for scripted tests (written to .local, mode 600;
 *                                       locally, --create-owner stands in for the owner's first sign-in)
 *   pnpm mcp wipe   [--env production]  delete every trial recipe and trial image (rows and R2 objects)
 *   pnpm mcp revoke [--env production]  revoke every connector token (chat clients must reconnect)
 *
 * Trial tables are outside the release-owned content, like reviews or Remix
 * formulas the Worker writes at runtime, so these don't take the release lock.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { mintMcpTokens, revokeAllMcpTokens } from '@eat-yeet/l4-content-cms/mcp-auth'
import { wipeTrialContent } from '@eat-yeet/l4-content-cms/trial'
import { openLocalCMS } from './cms-local'

const action = process.argv[2]
const at = process.argv.indexOf('--env')
const environment = at >= 0 ? process.argv[at + 1] : undefined
if (!['token', 'wipe', 'revoke'].includes(action ?? '')) throw new Error('Use: pnpm mcp token|wipe|revoke [--env production]')
if (environment && !['staging', 'production'].includes(environment)) throw new Error('Use --env staging or --env production')

const cms = environment ? await (await import('./cms-remote')).openRemoteCMS(environment, false) : await openLocalCMS()
try {
  const { payload, bucket } = cms as any
  if (action === 'token') {
    const email = String(process.env.OWNER_EMAIL ?? '').toLowerCase()
    let member = email && await payload.db.findOne({ collection: 'members', where: { email: { equals: email } } })
    // Local tests only: stand in for the owner's first Google sign-in.
    if (!member && !environment && email && process.argv.includes('--create-owner')) {
      const { upsertGoogleMember } = await import('@eat-yeet/l4-content-cms/members')
      const created = await upsertGoogleMember(payload, { sub: 'local-owner-test', email, emailVerified: true, name: 'Local Owner' })
      member = created && await payload.db.findOne({ collection: 'members', where: { id: { equals: Number(created.id) } } })
    }
    if (!member) throw new Error(`The owner (${email || 'OWNER_EMAIL unset'}) has no member account. Sign in to the site with Google once first.`)
    const tokens = await mintMcpTokens(payload, String(member.id))
    const directory = resolve('.local', environment ?? 'local')
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    const file = resolve(directory, 'mcp-token.json')
    writeFileSync(file, JSON.stringify({ accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, createdAt: new Date().toISOString() }), { mode: 0o600 })
    console.log(`Owner MCP token (valid ${tokens.expiresIn / 60} minutes) written to ${file}`)
  } else if (action === 'revoke') {
    await revokeAllMcpTokens(payload)
    console.log('Revoked every MCP connector token.')
  } else {
    const { mediaKeys } = await wipeTrialContent(payload)
    // The guarded remote bucket has no delete; trial objects are content-addressed, so stale ones are harmless.
    let removed = 0
    if (typeof bucket.delete === 'function') for (let i = 0; i < mediaKeys.length; i += 500) { await bucket.delete(mediaKeys.slice(i, i + 500)); removed += Math.min(500, mediaKeys.length - i) }
    console.log(`Wiped trial recipes and images (${removed} of ${mediaKeys.length} image objects removed).`)
    if (environment) await refreshRemoteCaches(environment)
  }
} finally { await cms.close() }

/** Same conditional generation change the Worker makes after a trial write. */
async function refreshRemoteCaches(environment: string) {
  const { loadRemoteConfig } = await import('./remote/config.mjs')
  const { deploymentCredentials } = await import('./remote/operator.mjs')
  const { readOutputs } = await import('./remote/pulumi.mjs')
  const { ObjectStore, r2Client } = await import('./remote/storage.mjs')
  const config = loadRemoteConfig(environment)
  const store = new ObjectStore(r2Client(config.accountId, deploymentCredentials(environment)), readOutputs(environment).operationsBucket)
  const current = await store.read('control.json')
  if (current?.value?.status !== 'ready') return console.log('The site isn’t ready (a release is running); caches refresh with it.')
  await store.write('control.json', { ...current.value, generation: randomUUID() }, { IfMatch: current.etag })
  console.log('Started a new cache generation.')
}
