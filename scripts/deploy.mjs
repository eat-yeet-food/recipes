/**
 * Deploy to Cloudflare Pages: ship, wait for the domain to actually be serving
 * it, purge, then verify in a browser.
 *
 * The order is the point, and it is not the obvious one.
 *
 * Uploading is already atomic — Wrangler uploads every file and only then flips
 * the deployment manifest, so "assets first, HTML last" is handled for you and
 * cannot be reordered. What is *not* atomic is propagation to each edge PoP.
 * For a short window after the flip, a PoP can answer a perfectly present asset
 * URL with the 404 fallback body. Any request during that window caches that
 * answer — including requests made by a well-meaning post-deploy check. A curl
 * sweep of 23 asset URLs seconds after a deploy is not a verification, it is a
 * cache-poisoning tool, and that is how this site went down.
 *
 * So: confirm the domain is serving this build — HTML *and* reachable assets —
 * before turning a browser loose on it, purge whatever the wait populated, and
 * only then verify.
 *
 * Requires CLOUDFLARE_API_TOKEN with Pages:Edit, Zone:Read and Cache Purge.
 * Run through Doppler; see CLAUDE.md section 9.
 *
 * Usage: pnpm run deploy
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { APP_ID, CLOUDFLARE_PROJECT, DEFAULT_APP_ID, DOPPLER, SITE_URL } from '#site-config'
import { assertDeployManifest, deploymentIdentity } from './deploy-manifest.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.output', 'public')
const PROJECT = CLOUDFLARE_PROJECT
const ZONE = new URL(SITE_URL).hostname
const PRODUCTION_BRANCH = 'main'

const token = process.env.CLOUDFLARE_API_TOKEN
if (!token) {
  console.error(
    'CLOUDFLARE_API_TOKEN is not set. Run through Doppler:\n' +
      `  ${APP_ID === DEFAULT_APP_ID ? '' : `APP_ID=${APP_ID} `}` +
      `doppler run -p ${DOPPLER.project} -c ${DOPPLER.config} -- pnpm run deploy`,
  )
  process.exit(1)
}

async function api(path, init) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const body = await res.json()
  if (!body.success) throw new Error(`${path} failed: ${JSON.stringify(body.errors)}`)
  return body.result
}

const step = (name) => console.log(`\n=== ${name} ===`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The hashed asset URLs this build's home page references. */
function localAssets() {
  const html = readFileSync(join(OUT, 'index.html'), 'utf8')
  return [...html.matchAll(/\/build\/[A-Za-z0-9._-]+\.(?:js|css)/g)].map((m) => m[0])
}

step(`build ${APP_ID} for ${SITE_URL}`)
rmSync(join(ROOT, '.output'), { recursive: true, force: true })
execFileSync('pnpm', ['run', 'build'], { stdio: 'inherit' })
assertDeployManifest(OUT, deploymentIdentity({ appId: APP_ID, cloudflareProject: PROJECT, siteUrl: SITE_URL }))
const expected = localAssets()
if (expected.length === 0) throw new Error('no /build/* assets found in .output/public/index.html')

step(`deploy .output/public -> ${PROJECT} production (${PRODUCTION_BRANCH})`)
execFileSync('npx', ['wrangler', 'pages', 'deploy', OUT, '--project-name', PROJECT, '--branch', PRODUCTION_BRANCH], {
  stdio: 'inherit',
})

// Two conditions, both required: the domain returns HTML naming this build's
// assets, and those assets are actually fetchable. Checking only the first is
// not enough — the manifest flips before every PoP can serve every file, and a
// browser opened in that gap gets a 404 for a chunk that plainly exists.
//
// Direct asset probes are safe here: a miss returns 404 under `no-store`
// because 404.html exists, so a probe that arrives early caches nothing.
step(`wait for ${ZONE} to serve this build`)
let live = false
for (let attempt = 1; attempt <= 45 && !live; attempt += 1) {
  await sleep(2000)
  try {
    const html = await (await fetch(`${SITE_URL}/?deploy-probe=${Date.now()}`)).text()
    if (!expected.every((asset) => html.includes(asset))) {
      process.stdout.write(`  attempt ${attempt}: HTML is still a stale build\n`)
      continue
    }
    const codes = await Promise.all(
      expected.map(async (asset) => (await fetch(SITE_URL + asset, { method: 'GET' })).status),
    )
    const missing = codes.filter((code) => code !== 200).length
    live = missing === 0
    if (!live) process.stdout.write(`  attempt ${attempt}: ${missing} asset(s) not propagated\n`)
  } catch (error) {
    process.stdout.write(`  attempt ${attempt}: ${error.message}\n`)
  }
}
if (!live) {
  console.error(`${ZONE} is still not serving this build's assets. Not purging; investigate.`)
  process.exit(1)
}
console.log(`${ZONE} is serving this build`)

async function purge() {
  const [zone] = await api(`/zones?name=${ZONE}`)
  if (!zone) throw new Error(`no Cloudflare zone named ${ZONE}`)
  await api(`/zones/${zone.id}/purge_cache`, {
    method: 'POST',
    body: JSON.stringify({ purge_everything: true }),
  })
  console.log(`purged ${ZONE} (${zone.id})`)
}

step(`purge edge cache for ${ZONE}`)
await purge()
await sleep(5000)

function verify() {
  try {
    execFileSync('node', [join(ROOT, 'test', 'verify-prod.mjs'), SITE_URL], { stdio: 'inherit' })
    return true
  } catch {
    return false
  }
}

step(`verify ${SITE_URL} in a browser`)
if (!verify()) {
  // A failure here is usually a stale entry the verification run itself raced
  // into cache. Purge and give it exactly one more chance before failing loud.
  step('verification failed — purging and retrying once')
  await purge()
  await sleep(10_000)
  if (!verify()) {
    console.error(`\n${SITE_URL} is NOT healthy after deploy. See failures above.`)
    process.exit(1)
  }
}

console.log(`\ndeployed and verified: ${SITE_URL}`)
