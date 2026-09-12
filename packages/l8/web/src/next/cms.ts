import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload } from 'payload'
import { createCMSConfig } from '@eat-yeet/l4-content-cms/config'
import { contentServices } from '@eat-yeet/l4-content-cms/service'
import { cache } from 'react'
export const runtimeSettings = () => ({
  origin: process.env.LOCAL_ORIGIN || 'http://127.0.0.1:3000',
  siteUrl: process.env.SITE_URL || 'https://eatyeet.com',
  indexable: process.env.SEO_AUDIT === '1',
})
export async function cmsConfig() {
  const { env } = await getCloudflareContext({ async: true })
  const vars = env as Record<string, any>
  const secret = process.env.PAYLOAD_SECRET || vars.PAYLOAD_SECRET
  // The owner allowlist is configuration, never request-controlled.
  if (vars.OWNER_EMAIL && !process.env.OWNER_EMAIL)
    process.env.OWNER_EMAIL = vars.OWNER_EMAIL
  return createCMSConfig(vars as any, {
    secret,
    origin:
      process.env.LOCAL_ORIGIN || vars.LOCAL_ORIGIN || 'http://127.0.0.1:3000',
    migrationDir: './migrations',
    push: false,
  })
}
export const cms = cache(async () => getPayload({ config: await cmsConfig() }))
export const siteData = cache(async (): Promise<Record<string, any>> => {
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
})
export const services = cache(async () => {
  const api = contentServices(await cms())
  return {
    recipes: { ...api.recipes, listRecipes: cache(api.recipes.listRecipes) },
    articles: {
      ...api.articles,
      listArticles: cache(api.articles.listArticles),
    },
  }
})
export const publicMedia = cache(async () => {
  const { docs } = await (
    await cms()
  ).find({
    collection: 'media',
    overrideAccess: false,
    user: null,
    pagination: false,
    depth: 0,
  })
  const site = await siteData()
  const active = site.mediaReferences ?? {}
  const media: Record<string, any> = {}
  for (const doc of docs) {
    const m = doc.manifest as any
    for (const name of m.names) {
      if (active[name] === m.hash) media['/images/' + name] = m
    }
  }
  return media
})

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
