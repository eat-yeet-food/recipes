// Only admitted anonymous document requests use this cache. The release guard
// must run first, including on hits; the browser still receives no-store.
const schema = 'public-html-v1'
const maxBytes = 1024 * 1024
const ttl = 86400
const publicPath = (path) => ['/', '/recipes', '/browse', '/learn', '/search'].includes(path) ||
  /^\/(recipes|learn)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)

function eligible(request, env, admission) {
  const url = new URL(request.url)
  if (env.DEPLOY_ENV !== 'production' || admission?.status !== 'ready' || admission.verification ||
    !env.RELEASE_ID || !request.headers.get('x-eatyeet-generation') || request.method !== 'GET' ||
    url.origin !== env.SITE_URL || url.href !== url.origin + url.pathname || !publicPath(url.pathname)) return false
  for (const [name] of request.headers) {
    if (['cookie', 'authorization', 'cf-access-jwt-assertion', 'x-eatyeet-access', 'range', 'cache-control', 'pragma', 'rsc', 'purpose', 'sec-purpose'].includes(name) ||
      /^(next-|x-nextjs-|x-middleware-|if-)/.test(name)) return false
  }
  const accept = request.headers.get('accept')
  return !accept || accept.includes('text/html') || accept === '*/*'
}

function marked(response, status) {
  const headers = new Headers(response.headers)
  headers.set('X-Eatyeet-HTML-Cache', status)
  headers.set('Cache-Control', 'private, no-store')
  return new Response(response.body, { status: response.status, headers })
}

function storable(response) {
  if (response.status !== 200 || !response.body || response.headers.has('set-cookie') ||
    !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')) return false
  // These Next variants are excluded at admission and removed from the render
  // request. A future response varying on any other input fails closed.
  const allowed = new Set(['accept-encoding', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-url'])
  return (response.headers.get('vary') ?? '').split(',').every((name) => !name.trim() || allowed.has(name.trim().toLowerCase()))
}

async function storeCompleteHTML(edge, key, response) {
  const reader = response.body.getReader(), chunks = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) { void reader.cancel().catch(() => {}); return }
      chunks.push(value)
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const html = new TextDecoder().decode(bytes)
    // Next can report a render error after streaming HTTP 200. Never retain a
    // truncated document, error shell, or deferred error boundary as a good page.
    if (!html.includes('id="main-content"') || !/<\/html>\s*$/.test(html) ||
      /__next_error__|data-dgst=|\$RX\(|:E\{/.test(html)) return
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', `public, max-age=${ttl}`)
    headers.delete('vary')
    headers.delete('content-length')
    await edge.put(key, new Response(bytes, { headers }))
  } finally { reader.releaseLock() }
}

export async function publicHTML(request, env, context, edge, admission, render) {
  if (!edge || !eligible(request, env, admission)) {
    const response = await render(request)
    return env.DEPLOY_ENV !== 'local' && /^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')
      ? marked(response, 'BYPASS') : response
  }
  const url = new URL(request.url)
  const namespace = [schema, env.DEPLOY_ENV, env.RELEASE_ID, request.headers.get('x-eatyeet-generation')].map(encodeURIComponent).join('/')
  const key = new Request(`${url.origin}/__html-cache/${namespace}${url.pathname}`)
  try {
    const hit = await edge.match(key)
    if (hit) return marked(hit, 'HIT')
  } catch { /* Cache failure falls back to the live renderer. */ }
  // A cache miss is rendered from a fixed public request, never caller-supplied
  // forwarding, framework, locale, bot, or identity headers that could poison it.
  const canonical = new Request(url.href, { signal: request.signal, headers: {
    accept: 'text/html', 'x-eatyeet-generation': request.headers.get('x-eatyeet-generation'),
  } })
  const response = await render(canonical)
  if (!storable(response)) return marked(response, 'BYPASS')
  context.waitUntil(storeCompleteHTML(edge, key, response.clone()).catch(() => {
    console.error(JSON.stringify({ event: 'html_cache_write_failed', releaseId: env.RELEASE_ID, path: url.pathname }))
  }))
  return marked(response, 'MISS')
}
