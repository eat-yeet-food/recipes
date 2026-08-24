/**
 * Head metadata helpers for route titles, canonical URLs, OpenGraph, and
 * Twitter cards.
 */

import type { PublicAppConfig } from './app-config-types'

interface SeoMeta {
  title: string
  description: string
  canonicalPath: string
  ogType?: 'website' | 'article'
  ogImage?: string
  noindex?: boolean
}

function absoluteUrl(siteUrl: string, raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw
  return `${siteUrl}${raw.startsWith('/') ? '' : '/'}${raw}`
}

export function buildSeoMeta(meta: SeoMeta, appConfig: PublicAppConfig) {
  const canonicalUrl = `${appConfig.siteUrl}${meta.canonicalPath}`
  // The default OpenGraph image is app-owned artwork.
  const imageUrl = absoluteUrl(appConfig.siteUrl, meta.ogImage || appConfig.defaultOgImage)

  const tags: Array<Record<string, string>> = [
    { title: meta.title },
    { name: 'description', content: meta.description },
    { property: 'og:title', content: meta.title },
    { property: 'og:description', content: meta.description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:type', content: meta.ogType ?? 'website' },
    { property: 'og:site_name', content: appConfig.siteName },
    { property: 'og:image', content: imageUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: meta.title },
    { name: 'twitter:description', content: meta.description },
    { name: 'twitter:image', content: imageUrl },
  ]

  if (meta.noindex) tags.push({ name: 'robots', content: 'noindex, follow' })

  return { meta: tags, links: [{ rel: 'canonical', href: canonicalUrl }] }
}
