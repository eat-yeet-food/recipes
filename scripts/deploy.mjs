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
 * So: confirm the domain is serving this build *before* generating any load,
 * purge whatever the wait populated, and only then verify.
 *
 * Requires CLOUDFLARE_API_TOKEN with Pages:Edit, Zone:Read and Cache Purge.
 * Run through Doppler; see CLAUDE.md section 9.
 *
 * Usage: npm run deploy
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SITE_URL } from '../site.config.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.output', 'public')
const PROJECT = 'eatyeet'
const ZONE = new URL(SITE_URL).hostname

const token = process.env.CLOUDFLARE_API_TOKEN
if (!token) {
  console.error(
    'CLOUDFLARE_API_TOKEN is not set. Run through Doppler:\n' +
      '  doppler run -p yeet -c dev -- npm run deploy',
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

const expected = localAssets()
if (expected.length === 0) throw new Error('no /build/* assets found in .output/public/index.html')

step(`deploy .output/public -> ${PROJECT}`)
execFileSync('npx', ['wrangler', 'pages', 'deploy', OUT, '--project-name', PROJECT], {
  stdio: 'inherit',
})

// One cheap request per attempt, against the HTML only. HTML is not cached
// long, so polling it cannot pin anything the way sweeping asset URLs can.
step(`wait for ${ZONE} to serve this build`)
let live = false
for (let attempt = 1; attempt <= 30 && !live; attempt += 1) {
  await sleep(2000)
  try {
    const html = await (await fetch(`${SITE_URL}/?deploy-probe=${Date.now()}`)).text()
    live = expected.every((asset) => html.includes(asset))
  } catch {
    live = false
  }
  if (!live) process.stdout.write(`  attempt ${attempt}: not yet\n`)
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
