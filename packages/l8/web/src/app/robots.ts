export const dynamic = 'force-dynamic'
import { runtimeSettings } from '../next/cms'
export default function robots() {
  const settings = runtimeSettings()
  return {
    rules: settings.indexable
      ? {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/api', '/preview', '/search', '/notebook', '/kitchen'],
        }
      : { userAgent: '*', disallow: '/' },
    sitemap: new URL('/sitemap.xml', settings.siteUrl).href,
  }
}
