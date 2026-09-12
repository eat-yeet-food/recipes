import { cms, siteData } from '../next/cms'
import { storedSEO } from '@eat-yeet/l4-content-model/storage'
export const dynamic = 'force-dynamic'
export default async function sitemap() {
  const site = await siteData(),
    payload = await cms()
  const routes = ['/', '/recipes', '/browse', '/learn'].map((path) => ({
    url: new URL(path, site.siteUrl).href,
  }))
  for (const collection of ['recipes', 'articles']) {
    const { docs } = await payload.find({
      collection,
      overrideAccess: false,
      user: null,
      pagination: false,
      depth: 0,
      where: { status: { equals: 'published' } },
    })
    for (const doc of docs)
      if (!storedSEO(doc)?.noindex)
        routes.push({
          url: new URL(
            `/${collection === 'articles' ? 'learn' : 'recipes'}/${doc.slug}`,
            site.siteUrl,
          ).href,
          lastModified: doc.updatedAt,
        } as any)
  }
  return routes
}
