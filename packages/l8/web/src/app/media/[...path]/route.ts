import { getCloudflareContext } from '@opennextjs/cloudflare'
import { cms, runtimeSettings } from '../../../next/cms'
export const dynamic = 'force-dynamic'
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const [hash, file, ...rest] = (await params).path
  const missing = () =>
    new Response(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  if (
    rest.length ||
    !/^([a-f0-9]{64})$/.test(hash) ||
    !/^([0-9]+\.(webp|avif)|social\.jpg)$/.test(file)
  )
    return missing()
  const payload = await cms()
  const settings = runtimeSettings()
  const allowOwner = !settings.remote || (new URL(request.url).origin === settings.origin && request.headers.get('x-eatyeet-access') === 'owner')
  const { user } = allowOwner ? await payload.auth({ headers: request.headers }) : { user: null }
  const { docs } = await payload.find({
    collection: 'media',
    overrideAccess: false,
    user,
    depth: 0,
    limit: 1,
    where: { sourceId: { equals: hash } },
  })
  if (!docs[0]) return missing()
  const manifest = docs[0].manifest as any,
    key = `${hash}/${file}`
  if (![...manifest.variants, manifest.social].some((v) => v.key === key))
    return missing()
  const { env } = await getCloudflareContext({ async: true })
  // Publication eligibility is deliberately checked before looking in edge cache.
  const edge = (globalThis as any).caches?.default
  const generation = request.headers.get('x-eatyeet-generation')
  const cacheKey = new Request(new URL(`/__media-cache/${generation}/${key}`, request.url))
  const mayCache = settings.remote && docs[0].public && edge && generation && !request.headers.has('cache-control') && !request.headers.has('if-none-match')
  if (mayCache) {
    const cached = await edge.match(cacheKey)
    if (cached) return cached
  }
  const object = await (env as any).R2.get(key)
  if (!object) return missing()
  const headers = new Headers({
    'Content-Type': object.httpMetadata.contentType,
    'Content-Length': String(object.size),
    ETag: object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': docs[0].public
      ? 'public, max-age=31536000'
      : 'private, no-store',
  })
  if (request.headers.get('if-none-match') === object.httpEtag)
    return new Response(null, { status: 304, headers })
  const response = new Response(object.body, { headers })
  if (mayCache) await edge.put(cacheKey, response.clone())
  return response
}
