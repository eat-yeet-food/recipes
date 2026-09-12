/** Exercise the actual release bundle with isolated copies of local D1/R2. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { command } from '../scripts/remote/process.mjs'
import { probeToken } from '../scripts/remote/release.mjs'

// Use the same workerd engine pinned transitively by Wrangler.
const { Miniflare, convertV4MiniflareOptions } = createRequire(import.meta.resolve('wrangler'))('miniflare')
const directory = mkdtempSync(join(tmpdir(), 'eatyeet-worker-smoke-'))
let worker
try {
  cpSync(resolve('.local/wrangler/v3'), join(directory, 'state'), { recursive: true })
  const config = join(directory, 'wrangler.json')
  writeFileSync(config, JSON.stringify({ name: 'eatyeet-smoke', main: resolve('packages/l8/web/worker.mjs'), compatibility_date: '2026-09-12', compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'] }))
  await command('pnpm', ['exec', 'wrangler', 'deploy', '--dry-run', '--config', config, '--outdir', join(directory, 'bundle')], { env: { WRANGLER_LOG_PATH: join(directory, 'wrangler.log') } })
  const modules = readdirSync(join(directory, 'bundle')).filter((name) => !name.endsWith('.map') && !name.startsWith('README'))
  assert.equal(modules.length, 1, 'Unexpected release modules: ' + modules.join(', '))
  const local = JSON.parse(readFileSync('.local/runtime.json', 'utf8'))
  assert.ok(!readFileSync(join(directory, 'bundle', modules[0]), 'utf8').includes(local.PAYLOAD_SECRET), 'local secrets must not be bundled')
  const credentials = { RELEASE_VERIFY_SECRET: 'isolated-smoke-test-secret-at-least-32-characters' }
  worker = new Miniflare(convertV4MiniflareOptions({ resourcePersistencePath: join(directory, 'state'),
    modulesRoot: join(directory, 'bundle'), modules: [{ type: 'ESModule', path: join(directory, 'bundle', modules[0]), contents: readFileSync(join(directory, 'bundle', modules[0])) }],
    compatibilityDate: '2026-09-12', compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
    bindings: { ...local, ...credentials, DEPLOY_ENV: 'production', SITE_URL: 'https://eatyeet.com', MEDIA_ORIGIN: 'https://media.eatyeet.com', RELEASE_ID: 'smoke', INDEXABLE: '1', ACCESS_TEAM_DOMAIN: 'smoke.cloudflareaccess.com', ACCESS_AUDIENCES: 'smoke' },
    d1Databases: { D1: '00000000-0000-0000-0000-000000000001' },
    r2Buckets: { R2: 'eatyeet-local-media', NEXT_INC_CACHE_R2_BUCKET: 'eatyeet-smoke-cache', OPERATIONS: 'eatyeet-smoke-operations' },
    assets: { directory: resolve('packages/l8/web/.open-next/assets'), binding: 'ASSETS', run_worker_first: true,
      routerConfig: { invoke_user_worker_ahead_of_assets: true, has_user_worker: true }, assetConfig: { html_handling: 'none', not_found_handling: 'none' } },
  }))
  const store = await worker.getR2Bucket('OPERATIONS')
  const state = { releaseId: 'smoke', contentRevision: 'a'.repeat(40), generation: 'one', status: 'ready' }
  await store.put('control.json', JSON.stringify(state))
  const get = (path, options) => worker.dispatchFetch(new URL(path, 'https://eatyeet.com').href, options)
  for (const path of ['/', '/recipes/new-york-style-pizza', '/learn/mixing-dough-and-gluten-development', '/api/public/recipes', '/sitemap.xml']) {
    const response = await get(path)
    const body = await response.text()
    assert.equal(response.status, 200, `${path}: ${body.slice(0, 180)}`)
    assert.equal(response.headers.get('x-eatyeet-release'), 'smoke')
    assert.match(response.headers.get('cache-control'), /no-store/)
    if (path === '/') {
      const asset = body.match(/src="([^\"]*\/_next\/static\/[^\"]+\.js)"/)?.[1]
      assert.ok(asset, 'real Next script is referenced')
      const script = await get(asset)
      assert.equal(script.status, 200)
      assert.match(script.headers.get('content-type'), /javascript/)
      await script.body?.cancel()
    }
  }
  const legacy = await get('/images/charred-crust-pizza.jpg', { redirect: 'manual' })
  assert.equal(legacy.status, 302)
  assert.match(legacy.headers.get('location'), /^https:\/\/media\.eatyeet\.com\/media\//)
  const cache = await worker.getR2Bucket('NEXT_INC_CACHE_R2_BUCKET')
  assert.ok((await cache.list()).objects.length > 0, 'public projections persist in R2')
  const initialKeys = new Set((await cache.list()).objects.map((object) => object.key))
  await store.put('control.json', JSON.stringify({ ...state, generation: 'two' }))
  await (await get('/')).text()
  assert.ok((await cache.list()).objects.some((object) => !initialKeys.has(object.key)), 'generation change gets independent cache entries')
  assert.equal((await get('https://alternate.workers.dev/')).status, 404)
  assert.equal((await get('/admin')).status, 403)
  assert.equal((await get('/api/owners', { headers: { 'Cf-Access-Jwt-Assertion': 'forged' } })).status, 403)
  const missing = await get('/media/' + '0'.repeat(64) + '/320.avif')
  assert.equal(missing.status, 404)
  assert.match(missing.headers.get('cache-control'), /no-store/)
  await store.put('control.json', JSON.stringify({ ...state, status: 'maintenance' }))
  const maintenance = await get('/')
  assert.equal(maintenance.status, 503)
  assert.equal(maintenance.headers.get('retry-after'), '60')
  const verified = await get('/', { headers: { 'X-Eatyeet-Verification': probeToken(credentials, 'smoke', 'https://eatyeet.com') } })
  assert.equal(verified.status, 200)
  await verified.text()
  mkdirSync('dist', { recursive: true })
  writeFileSync('dist/worker-smoke.json', JSON.stringify({ passed: true, bundleModules: modules, checks: ['real routes/assets', 'R2 projections', 'generation change', 'alternate hosts', 'protected handlers', 'missing media', 'maintenance', 'authenticated verification'] }, null, 2))
  console.log('Release Worker smoke passed with isolated local D1/R2.')
} finally {
  await worker?.dispose()
  rmSync(directory, { recursive: true, force: true })
}
