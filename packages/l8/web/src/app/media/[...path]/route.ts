import { getCloudflareContext } from '@opennextjs/cloudflare'
import { cms, runtimeSettings } from '../../../next/cms'
import { deliverMedia } from '../../../next/media-delivery.mjs'
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
  const { env, ctx } = await getCloudflareContext({ async: true })
  // Publication eligibility is deliberately checked before looking in edge cache.
  return deliverMedia(request, {
    key, isPublic: Boolean(docs[0].public),
    generation: request.headers.get('x-eatyeet-generation'),
    bucket: (env as any).R2,
    edge: settings.remote ? (globalThis as any).caches?.default : undefined,
    waitUntil: (work: Promise<unknown>) => ctx.waitUntil(work),
    releaseId: (env as any).RELEASE_ID,
  })
}
