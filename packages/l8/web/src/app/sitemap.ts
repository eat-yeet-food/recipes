import { siteData, sitemapDocuments } from '../next/cms'
export const dynamic = 'force-dynamic'
export default async function sitemap() {
  const site = await siteData()
  const routes = ['/', '/recipes', '/browse', '/learn'].map((path) => ({
    url: new URL(path, site.siteUrl).href,
  }))
  for (const document of await sitemapDocuments()) routes.push({ url: new URL(document.path, site.siteUrl).href, lastModified: document.updatedAt } as any)
  return routes
}
