import assert from 'node:assert/strict'
import { it } from 'node:test'
import { appBuildConfig } from './app-build-config.mjs'

it('isolates the selected app and excludes deployment and private analytics fields', () => {
  const build = appBuildConfig({ id: 'second', siteName: 'Second', cloudflareProject: 'private', doppler: { project: 'private' }, analytics: { googleTagId: 'G-123', secret: 'private' }, privateToken: 'private' }, '/workspace')
  assert.ok(!JSON.stringify(build.define).includes('private'))
  assert.deepEqual(JSON.parse(build.define.__APP_CONFIG__).analytics, { googleTagId: 'G-123' })
  const appAliases = build.alias.filter(alias => alias.find.startsWith('@app/'))
  assert.equal(appAliases.length, 4)
  assert.ok(appAliases.every(alias => alias.replacement.startsWith('/workspace/apps/second/src/')))
  assert.ok(appAliases.some(alias => alias.find === '@app/articles'))
})
