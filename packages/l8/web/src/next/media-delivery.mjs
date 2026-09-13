/** Called only after the live Payload publication/owner and variant checks. */
export async function deliverMedia(request, { key, isPublic, generation, bucket, edge, waitUntil, releaseId }) {
  const head = request.method === 'HEAD'
  const cacheKey = new Request(new URL(`/__media-cache/${generation}/${key}`, request.url))
  const mayCache = isPublic && edge && generation && !request.headers.has('cache-control')
  const conditional = (response) => request.headers.has('if-none-match') && request.headers.get('if-none-match') === response.headers.get('etag')
    ? new Response(null, { status: 304, headers: response.headers })
    : head ? new Response(null, { headers: response.headers }) : response
  if (mayCache) {
    try {
      const cached = await edge.match(cacheKey)
      if (cached) {
        const response = new Response(cached.body, cached)
        response.headers.set('X-Eatyeet-Media-Cache', 'HIT')
        return conditional(response)
      }
    } catch { /* Cache availability must not prevent an authorized R2 read. */ }
  }
  const object = await (head ? bucket.head(key) : bucket.get(key))
  if (!object) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  const response = new Response(head ? null : object.body, { headers: {
    'Content-Type': object.httpMetadata.contentType,
    'Content-Length': String(object.size),
    ETag: object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': isPublic ? 'public, max-age=31536000' : 'private, no-store',
    'X-Eatyeet-Media-Cache': mayCache ? 'MISS' : 'BYPASS',
  } })
  if (mayCache && !head) waitUntil(edge.put(cacheKey, response.clone()).catch(() => {
    console.error(JSON.stringify({ event: 'media_cache_write_failed', releaseId, key }))
  }))
  return conditional(response)
}
