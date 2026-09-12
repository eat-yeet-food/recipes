// Environment-free policy helpers are also exercised without a Worker runtime.
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const jwksCache = new Map()
const decode = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
export function normalizedPath(url) {
  const path = new URL(url).pathname
  if (/%(?:2f|5c|00|25)/i.test(path) || path.includes('\\')) throw new Error('Ambiguous path')
  const decoded = decodeURIComponent(path)
  if (decoded.includes('\0') || decoded.includes('\\')) throw new Error('Invalid path')
  return decoded.replace(/\/+$/, '') || '/'
}
export function protectedPath(path) {
  return ['/admin', '/preview'].some((root) => path === root || path.startsWith(root + '/')) ||
    ((path === '/api' || path.startsWith('/api/')) && !(path === '/api/public' || path.startsWith('/api/public/')))
}
export async function verifyAccess(token, env, fetcher = fetch, now = Date.now()) {
  try {
    if (!token || token.length > 16384 || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const header = JSON.parse(decoder.decode(decode(parts[0])))
    const claims = JSON.parse(decoder.decode(decode(parts[1])))
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`
    const audiences = String(env.ACCESS_AUDIENCES || '').split(',').filter(Boolean)
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || claims.iss !== issuer ||
      !Number.isFinite(claims.exp) || claims.exp <= now / 1000 ||
      (claims.nbf != null && (!Number.isFinite(claims.nbf) || claims.nbf > now / 1000)) ||
      claims.email?.toLowerCase() !== env.OWNER_EMAIL?.toLowerCase() ||
      !audiences.some((aud) => (Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(aud))) return false
    let cached = jwksCache.get(issuer)
    if (!cached || cached.expires < now) {
      const response = await fetcher(`${issuer}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return false
      cached = { keys: (await response.json()).keys, expires: now + 300000 }
      jwksCache.set(issuer, cached)
    }
    const jwk = cached.keys?.find((key) => key.kid === header.kid && key.kty === 'RSA')
    if (!jwk) return false
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), encoder.encode(parts.slice(0, 2).join('.')))
  } catch { return false }
}
export async function verifyReleaseProbe(token, secret, state, origin, now = Date.now()) {
  try {
    if (!secret || secret.length < 32 || !token || token.length > 2048) return false
    const [body, signature, extra] = token.split('.')
    if (extra) return false
    const claims = JSON.parse(decoder.decode(decode(body)))
    if (claims.releaseId !== state.releaseId || claims.origin !== origin ||
      !Number.isFinite(claims.exp) || claims.exp <= now / 1000 || claims.exp > now / 1000 + 600) return false
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    return await crypto.subtle.verify('HMAC', key, decode(signature), encoder.encode(body))
  } catch { return false }
}
export function privateResponse(status, message, extra = {}) {
  return new Response(message, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', 'Content-Type': 'text/plain; charset=utf-8', ...extra } })
}
export async function remoteRequest(request, env, next) {
  if (!env.DEPLOY_ENV || env.DEPLOY_ENV === 'local') return next(request)
  let path
  try { path = normalizedPath(request.url) } catch { return privateResponse(400, 'Invalid path') }
  const url = new URL(request.url)
  if (!['staging', 'production'].includes(env.DEPLOY_ENV) || ![env.SITE_URL, env.MEDIA_ORIGIN].includes(url.origin)) return privateResponse(404, 'Not found')
  const mediaHost = url.origin !== env.SITE_URL
  if (mediaHost && !path.startsWith('/media/')) return privateResponse(404, 'Not found')
  const accessToken = request.headers.get('Cf-Access-Jwt-Assertion')
  const needsAccess = env.DEPLOY_ENV === 'staging' || protectedPath(path)
  const access = accessToken ? await verifyAccess(accessToken, env) : false
  if (needsAccess && !access) return privateResponse(403, 'Owner Access authentication required')
  let state
  try { state = await (await env.OPERATIONS.get('control.json'))?.json() }
  catch { return privateResponse(503, 'Release state unavailable', { 'Retry-After': '60' }) }
  if (!state?.generation || !state?.releaseId) return privateResponse(503, 'Site is not initialized', { 'Retry-After': '60' })
  const probe = ['GET', 'HEAD'].includes(request.method) && await verifyReleaseProbe(request.headers.get('X-Eatyeet-Verification'), env.RELEASE_VERIFY_SECRET, state, env.SITE_URL)
  if (path === '/.well-known/eatyeet-release') return Response.json({ releaseId: env.RELEASE_ID, contentRevision: state.contentRevision, generation: state.generation, status: state.status }, { headers: { 'Cache-Control': 'no-store' } })
  if (state.status !== 'ready' && !probe) return privateResponse(503, 'We’re updating the site. Please try again shortly.', { 'Retry-After': '60' })
  const headers = new Headers(request.headers)
  for (const name of ['x-eatyeet-generation', 'x-eatyeet-access', 'x-eatyeet-verification']) headers.delete(name)
  headers.set('x-eatyeet-generation', state.generation)
  if (access) headers.set('x-eatyeet-access', 'owner')
  // Bound request lifetime so the release command can drain admitted requests.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  let response
  try {
    response = await Promise.race([
      next(new Request(request, { headers, signal: controller.signal })),
      new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Request timeout')), { once: true })),
    ])
    const outgoing = new Headers(response.headers)
    outgoing.set('X-Eatyeet-Release', env.RELEASE_ID)
    if (env.DEPLOY_ENV !== 'production' || env.INDEXABLE !== '1') outgoing.set('X-Robots-Tag', 'noindex, nofollow')
    const publicAsset = path.startsWith('/media/') || path.startsWith('/_next/static/') || path.startsWith('/fonts/') || path === '/donut-icon.svg'
    if (needsAccess || !publicAsset || response.status >= 400) outgoing.set('Cache-Control', 'private, no-store')
    if (!response.body) { clearTimeout(timer); return new Response(null, { status: response.status, headers: outgoing }) }
    const reader = response.body.getReader()
    const body = new ReadableStream({
      async pull(stream) {
        try {
          if (controller.signal.aborted) throw new Error('Request timeout')
          const { value, done } = await reader.read()
          if (done) { clearTimeout(timer); stream.close() } else stream.enqueue(value)
        } catch (error) { clearTimeout(timer); stream.error(error); await reader.cancel().catch(() => {}) }
      },
      async cancel() { clearTimeout(timer); controller.abort(); await reader.cancel() },
    })
    controller.signal.addEventListener('abort', () => reader.cancel().catch(() => {}), { once: true })
    return new Response(body, { status: response.status, headers: outgoing })
  } catch {
    clearTimeout(timer)
    console.error(JSON.stringify({ event: 'request_failed', releaseId: env.RELEASE_ID, path }))
    return privateResponse(503, 'Temporarily unavailable', { 'Retry-After': '60' })
  }
}
