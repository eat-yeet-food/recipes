/**
 * Head metadata. A direct port of the original site's `platform/L1/seo.ts` —
 * same tags, same order, same defaults — so the archive presents itself to
 * crawlers and link unfurlers exactly as the original did.
 */

import { SITE_URL } from './paths'

interface SeoMeta {
  title: string
  description: string
  canonicalPath: string
  ogType?: 'website' | 'article'
  ogImage?: string
  noindex?: boolean
}

function absoluteUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw
  return `${SITE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`
}

export function buildSeoMeta(meta: SeoMeta) {
  const canonicalUrl = `${SITE_URL}${meta.canonicalPath}`
  // The original defaulted to /images/hero.webp, which did not survive the
  // bucket. The donut hero is the site's own artwork and stands in for it.
  const imageUrl = absoluteUrl(meta.ogImage || '/images/hero-donuts.jpg')

  const tags: Array<Record<string, string>> = [
    { title: meta.title },
    { name: 'description', content: meta.description },
    { property: 'og:title', content: meta.title },
    { property: 'og:description', content: meta.description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:type', content: meta.ogType ?? 'website' },
    { property: 'og:site_name', content: 'Eat / Yeet' },
    { property: 'og:image', content: imageUrl },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: meta.title },
    { name: 'twitter:description', content: meta.description },
    { name: 'twitter:image', content: imageUrl },
  ]

  if (meta.noindex) tags.push({ name: 'robots', content: 'noindex, follow' })

  return { meta: tags, links: [{ rel: 'canonical', href: canonicalUrl }] }
}
