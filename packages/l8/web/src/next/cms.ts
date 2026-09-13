import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload } from 'payload'
import { createCMSConfig } from '@eat-yeet/l4-content-cms/config'
import { contentServices } from '@eat-yeet/l4-content-cms/service'
import { cache } from 'react'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { storedContent, storedSEO } from '@eat-yeet/l4-content-model/storage'
import { ProjectionCache } from './projection-cache.mjs'
const projections = new ProjectionCache()
function runtimeVars(): Record<string, any> {
  try {
    const env = getCloudflareContext().env as Record<string, any>
    return ['staging', 'production'].includes(env.DEPLOY_ENV) ? { ...process.env, ...env } : { ...env, ...process.env }
  } catch { return process.env }
}
export const runtimeSettings = () => {
  const vars = runtimeVars()
  const remote = ['staging', 'production'].includes(vars.DEPLOY_ENV)
  const origin = remote ? vars.SITE_URL : vars.LOCAL_ORIGIN || 'http://127.0.0.1:3000'
  if (remote && !/^https:\/\//.test(origin)) throw new Error('Remote trusted origin is required')
  return { origin, siteUrl: vars.SITE_URL || 'https://eatyeet.com',
    mediaOrigin: remote ? vars.MEDIA_ORIGIN : '', remote,
    indexable: remote ? vars.DEPLOY_ENV === 'production' && vars.INDEXABLE === '1' : vars.SEO_AUDIT === '1' }
}
async function publicProjection<T>(key: string, read: () => Promise<T>): Promise<T> {
  const vars = runtimeVars()
  if (!runtimeSettings().remote) return read()
  const generation = (await headers()).get('x-eatyeet-generation')
  if (!generation) throw new Error('Remote request must pass the release guard')
  const namespace = ['public-content-v1', vars.DEPLOY_ENV, vars.RELEASE_ID, generation]
  return projections.read(namespace, key, () =>
    unstable_cache(read, [...namespace, key], { revalidate: false })())
}
export async function cmsConfig() {
  const { env } = await getCloudflareContext({ async: true })
  const vars = env as Record<string, any>
  const secret = process.env.PAYLOAD_SECRET || vars.PAYLOAD_SECRET
  // The owner allowlist is configuration, never request-controlled.
  if (vars.OWNER_EMAIL && !process.env.OWNER_EMAIL)
    process.env.OWNER_EMAIL = vars.OWNER_EMAIL
  return createCMSConfig(vars as any, {
    secret,
    origin: runtimeSettings().origin,
    migrationDir: './migrations',
    push: false,
  })
}
export const cms = cache(async () => getPayload({ config: await cmsConfig() }))
export const publicDocument = cache(async (collection: 'recipes' | 'articles', slug: string) => publicProjection(`document:${collection}:${slug}`, async () => {
  const { docs } = await (await cms()).find({ collection, overrideAccess: false, user: null, depth: 0, limit: 1,
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] } })
  return docs[0] ? { updatedAt: docs[0].updatedAt as string, content: storedContent(docs[0]), seo: storedSEO(docs[0]) } : null
}))
export const sitemapDocuments = cache(async () => publicProjection('sitemap', async () => {
  const documents: { path: string; updatedAt: string }[] = []
  for (const collection of ['recipes', 'articles'] as const) {
    const { docs } = await (await cms()).find({ collection, overrideAccess: false, user: null, pagination: false, depth: 0,
      select: { slug: true, updatedAt: true, searchAppearance: true, seo: true }, where: { status: { equals: 'published' } } })
    for (const doc of docs) if (!storedSEO(doc)?.noindex) documents.push({ path: `/${collection === 'articles' ? 'learn' : 'recipes'}/${doc.slug}`, updatedAt: doc.updatedAt as string })
  }
  return documents
}))
export const siteData = cache(async (): Promise<Record<string, any>> => publicProjection('site', async () => {
  const payload = await cms()
  const { content } = await payload.findGlobal({
    slug: 'site',
    overrideAccess: false,
    depth: 0,
  })
  if (!content)
    throw new Error('Site content is not synchronized. Run pnpm content:sync.')
  return {
    ...(content as Record<string, any>),
    siteUrl: runtimeSettings().siteUrl,
  }
}))
const contentAPI = cache(async () => contentServices(await cms()))
export const services = cache(async () => {
  type API = Awaited<ReturnType<typeof contentAPI>>
  return {
    recipes: {
      listRecipes: cache((request?: Parameters<API['recipes']['listRecipes']>[0]) => publicProjection('recipes:' + JSON.stringify(request ?? {}), async () => (await contentAPI()).recipes.listRecipes(request))),
      getRecipe: (request: Parameters<API['recipes']['getRecipe']>[0]) => publicProjection('recipe:' + request.slug, async () => (await contentAPI()).recipes.getRecipe(request)),
    },
    articles: {
      listArticles: cache((request?: Parameters<API['articles']['listArticles']>[0]) => publicProjection('articles:' + JSON.stringify(request ?? {}), async () => (await contentAPI()).articles.listArticles(request))),
      getArticle: (request: Parameters<API['articles']['getArticle']>[0]) => publicProjection('article:' + request.slug, async () => (await contentAPI()).articles.getArticle(request)),
    },
  }
})
export const publicMedia = cache(async () => {
  const site = await siteData()
  return publicProjection('media', async () => {
  const { docs } = await (
    await cms()
  ).find({
    collection: 'media',
    overrideAccess: false,
    user: null,
    pagination: false,
    depth: 0,
  })
  const active = site.mediaReferences ?? {}
  const media: Record<string, any> = {}
  for (const doc of docs) {
    const m = doc.manifest as any
    for (const name of m.names) {
      if (active[name] === m.hash) media['/images/' + name] = m
    }
  }
  const origin = runtimeSettings().mediaOrigin
  if (origin) for (const manifest of Object.values(media)) {
    manifest.url = new URL(manifest.url, origin).href
    for (const variant of [...manifest.variants, manifest.social]) variant.url = new URL(variant.url, origin).href
  }
  return media
})})

/** Only fields used by <picture> cross the client boundary. */
export function deliveryMedia(media: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(media).map(([name, m]) => [
      name,
      {
        url: m.url,
        width: m.width,
        height: m.height,
        alt: m.alt,
        ...(m.focalPoint ? { focalPoint: m.focalPoint } : {}),
        variants: m.variants.map(({ url, width, format }: any) => ({
          url,
          width,
          format,
        })),
      },
    ]),
  )
}
