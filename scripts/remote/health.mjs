import { pathToFileURL } from 'node:url'

export async function releaseHealth(origin, { releaseId, contentRevision, accessToken, request = fetch, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const headers = { 'Cache-Control': 'no-cache', ...(accessToken ? { Cookie: `CF_Authorization=${accessToken}` } : {}) }
  const get = (path) => request(new URL(path, origin), { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) })
  let state
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await get('/.well-known/eatyeet-release')
    state = response.ok && response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
    if (state?.releaseId === releaseId && state.status === 'ready' && (!contentRevision || state.contentRevision === contentRevision)) break
    if (attempt === 5) throw new Error('Deployed release identity is not ready')
    await pause(2000)
  }
  const results = await Promise.allSettled(['/', '/recipes/new-york-style-pizza', '/api/public/ratings/new-york-style-pizza'].map(async (path) => {
    const response = await get(path)
    if (!response.ok || response.headers.get('x-eatyeet-release') !== releaseId) throw new Error(`Release health failed: ${path} (HTTP ${response.status})`)
    if (path.startsWith('/api/')) {
      if (!response.headers.get('content-type')?.includes('application/json') || (await response.json()).error) throw new Error('Ratings API health failed')
      return
    }
    const html = await response.text()
    if (!html.includes('id="main-content"')) throw new Error(`Missing page content: ${path}`)
    const script = html.match(/<script[^>]+src="([^"?]+\/_next\/static\/[^"?]+|\/_next\/static\/[^"?]+)"/i)?.[1]
    if (!script || new URL(script, origin).origin !== origin) throw new Error(`Missing local application script: ${path}`)
    const asset = await get(script)
    if (!asset.ok || /text\/html/i.test(asset.headers.get('content-type') ?? '')) throw new Error('Application asset health failed')
    await asset.arrayBuffer()
  }))
  const failure = results.find((result) => result.status === 'rejected')
  if (failure) throw failure.reason
  const protectedResponse = await request(new URL('/api/owners', origin), { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  if (![302, 303, 401, 403].includes(protectedResponse.status)) throw new Error('Owner API admitted an anonymous request')
  console.log(`Release healthy: ${origin} (${releaseId})`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await releaseHealth(process.argv[2], { releaseId: process.env.EATYEET_EXPECTED_RELEASE,
    contentRevision: process.env.EATYEET_EXPECTED_CONTENT_REVISION, accessToken: process.env.EATYEET_ACCESS_TOKEN })
}
