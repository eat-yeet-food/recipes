import * as pulumi from '@pulumi/pulumi'
import * as cloudflare from '@pulumi/cloudflare'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const configuration = new pulumi.Config()
const settings = configuration.requireObject<any>('settings')
const environment = pulumi.getStack()
if (!['bootstrap', 'staging', 'production'].includes(environment)) throw new Error('Unknown deployment environment')
const accountId = settings.accountId
const provider = new cloudflare.Provider('cloudflare', { apiToken: pulumi.secret(process.env.CLOUDFLARE_API_TOKEN!) })
const protectedOptions = { provider, protect: true, retainOnDelete: true }
const imported = (name: string) => ({ ...protectedOptions, ...(settings.imports?.[name] ? { import: settings.imports[name] } : {}) })
const exportValues: Record<string, any> = {}
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

if (environment === 'bootstrap') {
  const existingOrganization = cloudflare.getZeroTrustOrganizationOutput({ accountId }, { provider })
  const preserved = Object.fromEntries([
    'allowAuthenticateViaWarp', 'authDomain', 'autoRedirectToIdentity', 'customPages', 'denyUnmatchedRequests',
    'denyUnmatchedRequestsExemptedZoneNames', 'isUiReadOnly', 'loginDesign', 'mfaRequiredForAllApps',
    'mfaSshPivKeyRequirements', 'name', 'sessionDuration', 'uiReadOnlyToggleReason', 'userSeatExpirationInactiveTime',
    'warpAuthNonBrowser401', 'warpAuthSessionDuration',
  ].map((key) => [key, existingOrganization.apply((organization) => (organization as any)[key])]))
  new cloudflare.ZeroTrustOrganization('access-organization', { accountId, ...preserved,
    mfaConfigurationAllowed: true,
    mfaConfig: existingOrganization.mfaConfig.apply((old) => ({ ...old,
      allowedAuthenticators: old?.allowedAuthenticators?.length ? old.allowedAuthenticators : ['totp', 'security_key', 'biometrics'],
      sessionDuration: old?.sessionDuration ?? '2h', amrMatchingSessionDuration: old?.amrMatchingSessionDuration ?? '2h',
    })),
  }, { ...protectedOptions, import: accountId })
  const identity = new cloudflare.ZeroTrustAccessIdentityProvider('cloudflare-login', {
    accountId, name: 'Cloudflare', type: 'cloudflare', config: { restrictToAccountMembers: true },
  }, { ...protectedOptions, ...(settings.cloudflareIdpId ? { import: `accounts/${accountId}/${settings.cloudflareIdpId}` } : {}) })
  exportValues.cloudflareIdpId = identity.id
  const state = new cloudflare.R2Bucket('pulumi-state', { accountId, name: settings.stateBucket, jurisdiction: 'default' }, imported('pulumi-state'))
  new cloudflare.R2ManagedDomain('state-no-public-domain', { accountId, bucketName: state.name, enabled: false }, protectedOptions)
  // Only backup copies expire. Pulumi checkpoints, locks, and history never do.
  new cloudflare.R2BucketLifecycle('state-backup-retention', { accountId, bucketName: state.name, rules: [
    { id: 'backups-30-days', enabled: true, conditions: { prefix: 'backups/' }, deleteObjectsTransition: { condition: { type: 'Age', maxAge: 2592000 } } },
  ] }, protectedOptions)
  exportValues.stateBucket = state.name
} else {
  const prefix = `eatyeet-${environment}`
  const database = new cloudflare.D1Database('content', { accountId, name: `${prefix}-content` }, imported('content'))
  const buckets = Object.fromEntries(['media', 'cache', 'operations'].map((name) => {
    const bucket = new cloudflare.R2Bucket(name, { accountId, name: `${prefix}-${name}`, jurisdiction: 'default' }, imported(name))
    new cloudflare.R2ManagedDomain(`${name}-no-public-domain`, { accountId, bucketName: bucket.name, enabled: false }, protectedOptions)
    return [name, bucket]
  }))
  new cloudflare.R2BucketLifecycle('operations-backup-retention', { accountId, bucketName: buckets.operations.name, rules: [
    { id: 'backups-30-days', enabled: true, conditions: { prefix: 'backups/' }, deleteObjectsTransition: { condition: { type: 'Age', maxAge: 2592000 } } },
  ] }, protectedOptions)
  if (!settings.cloudflareIdpId) throw new Error('Inventory and configure the account-restricted Cloudflare identity provider first')
  const policy = new cloudflare.ZeroTrustAccessPolicy('owner', { accountId, name: `${prefix}-owner`, decision: 'allow',
    includes: [{ email: { email: settings.ownerEmail } }],
    requires: [{ cloudflareAccountMember: { accountId } }, { loginMethod: { id: settings.cloudflareIdpId } }],
    mfaConfig: { mfaDisabled: false, allowedAuthenticators: ['totp', 'security_key', 'biometrics'], sessionDuration: '2h' },
  }, imported('owner'))
  const host = new URL(settings.origin).hostname
  const paths = environment === 'staging' ? [''] : ['/admin', '/api', '/preview']
  const accessApps = paths.map((path, i) => new cloudflare.ZeroTrustAccessApplication(`owner-access-${i}`, {
    accountId, name: `${prefix}${path || '-staging'}`, domain: host + path, type: 'self_hosted',
    allowedIdps: [settings.cloudflareIdpId], sessionDuration: '2h', autoRedirectToIdentity: true,
    appLauncherVisible: false, allowAuthenticateViaWarp: false,
    policies: [{ id: policy.id, precedence: 1 }],
    mfaConfig: { mfaDisabled: false, allowedAuthenticators: ['totp', 'security_key', 'biometrics'], sessionDuration: '2h' },
  }, imported(`owner-access-${i}`)))
  if (environment === 'production') new cloudflare.ZeroTrustAccessApplication('public-api', {
    accountId, name: `${prefix}-public-api`, type: 'self_hosted', domain: `${host}/api/public`,
    policies: [{ name: 'public-reads', decision: 'bypass', includes: [{ everyone: {} }], precedence: 1 }],
    appLauncherVisible: false,
  }, imported('public-api'))
  const release = configuration.getObject<any>('release')
  const content = release ? readFileSync(release.bundleFile) : Buffer.from('export default { fetch() { return new Response("Not initialized", {status:503,headers:{"Cache-Control":"no-store"}}) } }')
  if (release && hash(content) !== release.bundleHash) throw new Error('Release bundle checksum differs')
  const variables = { DEPLOY_ENV: environment, SITE_URL: settings.origin, MEDIA_ORIGIN: settings.mediaOrigin,
    OWNER_EMAIL: settings.ownerEmail, ACCESS_TEAM_DOMAIN: settings.accessTeamDomain,
    RELEASE_ID: release?.id ?? 'uninitialized', INDEXABLE: settings.cutover && environment === 'production' ? '1' : '0' }
  const worker = new cloudflare.WorkersScript('application', {
    accountId, scriptName: prefix, content: content.toString(), contentType: 'application/javascript+module', mainModule: 'worker.js',
    compatibilityDate: '2026-09-12', compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
    bindings: [
      { name: 'D1', type: 'd1', id: database.uuid },
      { name: 'R2', type: 'r2_bucket', bucketName: buckets.media.name },
      { name: 'OPERATIONS', type: 'r2_bucket', bucketName: buckets.operations.name },
      { name: 'NEXT_INC_CACHE_R2_BUCKET', type: 'r2_bucket', bucketName: buckets.cache.name },
      ...(release ? [{ name: 'ASSETS', type: 'assets' }] : []),
      ...Object.entries(variables).map(([name, text]) => ({ name, type: 'plain_text', text })),
      { name: 'ACCESS_AUDIENCES', type: 'plain_text', text: pulumi.all(accessApps.map((app) => app.aud)).apply((values) => values.join(',')) },
      ...['PAYLOAD_SECRET', 'RELEASE_VERIFY_SECRET'].map((name) => {
        if (!process.env[name]) throw new Error(`Missing Keychain runtime secret ${name}`)
        return { name, type: 'secret_text', text: pulumi.secret(process.env[name]!) }
      }),
    ],
    ...(release ? { assets: { jwt: configuration.requireSecret('assetsJwt'), config: { runWorkerFirst: true, htmlHandling: 'none', notFoundHandling: 'none' } } } : {}),
    observability: { enabled: true, headSamplingRate: 1 },
  }, imported('application'))
  const disabled = new cloudflare.WorkersScriptSubdomain('no-alternate-hostnames', {
    accountId, scriptName: worker.scriptName, enabled: false, previewsEnabled: false,
  }, protectedOptions)
  if (environment === 'staging') {
    new cloudflare.WorkersCustomDomain('site-domain', { accountId, hostname: host, service: worker.scriptName, zoneId: settings.zoneId }, { ...imported('site-domain'), dependsOn: [disabled, ...accessApps] })
  }
  if (environment === 'production' && settings.cutover) new cloudflare.WorkersRoute('production-route', {
    zoneId: settings.zoneId, pattern: `${host}/*`, script: worker.scriptName,
  }, { ...imported('production-route'), dependsOn: [disabled, ...accessApps] })
  if (environment === 'production' && settings.cutover) new cloudflare.WorkersCustomDomain('media-domain', {
    accountId, hostname: new URL(settings.mediaOrigin).hostname, service: worker.scriptName, zoneId: settings.zoneId,
  }, { ...imported('media-domain'), dependsOn: [disabled] })
  Object.assign(exportValues, { databaseId: database.uuid, databaseName: database.name, mediaBucket: buckets.media.name,
    operationsBucket: buckets.operations.name, cacheBucket: buckets.cache.name, workerName: worker.scriptName,
    accessAudiences: pulumi.all(accessApps.map((app) => app.aud)), releaseId: release?.id ?? 'uninitialized' })
}
export const resources = exportValues
