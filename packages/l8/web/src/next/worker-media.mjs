import { deliverMedia } from './media-delivery.mjs'

/** Public-only projection of Payload's media table; private reads stay in Payload. */
export async function publicWorkerMedia(request, env, context, edge) {
  if (!['staging', 'production'].includes(env.DEPLOY_ENV) || !['GET', 'HEAD'].includes(request.method)) return null
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/media/')) return null
  const missing = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  const match = url.pathname.match(/^\/media\/([a-f0-9]{64})\/(\d+\.(?:avif|webp)|social\.jpg)$/)
  if (!match) return missing()
  const [, hash, file] = match
  // A fresh, indexed, parameterized read enforces publication before every hit.
  // Never cache this result or broaden it to owner/draft access.
  const record = await env.D1.prepare('SELECT manifest FROM media WHERE source_id = ? AND public = 1 LIMIT 1').bind(hash).first()
  if (!record) return url.origin === env.SITE_URL ? null : missing()
  const manifest = JSON.parse(record.manifest)
  const key = `${hash}/${file}`
  if (![...manifest.variants, manifest.social].some((variant) => variant.key === key)) return missing()
  return deliverMedia(request, {
    key, isPublic: true, generation: request.headers.get('x-eatyeet-generation'),
    bucket: env.R2, edge, waitUntil: (work) => context.waitUntil(work), releaseId: env.RELEASE_ID,
  })
}
