import type { Metadata } from 'next'
import { runtimeSettings, publicMedia } from './cms'
import {
  isoDuration,
  formatYield,
  stripTags,
  labelize,
} from '@eat-yeet/l2-recipe-domain/format'
export async function metadataFor(
  site: any,
  path: string,
  doc?: any,
): Promise<Metadata> {
  const kind = path.startsWith('/recipes/')
    ? 'recipe'
    : path.startsWith('/learn/')
      ? 'article'
      : null
  const page = path === '/' ? 'home' : path.slice(1)
  const c = doc?.content,
    seo = doc?.seo ?? {}
  const title =
    seo.title ||
    (c
      ? `${c.title} | ${site.siteName}`
      : site.copy.pages[`${page}Title`] || site.siteName)
  const description =
    seo.description ||
    c?.description ||
    (page === 'home'
      ? site.copy.description
      : site.copy.pages[`${page}Description`]) ||
    site.copy.description
  const canonical = new URL(path, site.siteUrl).href
  const media = await publicMedia()
  const raw = seo.image || c?.image || site.defaultOgImage
  const m = media[raw] || media['/images/' + raw]
  const image = {
    url: new URL(m?.social?.url || site.defaultOgImage, site.siteUrl).href,
    width: m?.social?.width,
    height: m?.social?.height,
    alt: c?.title || site.siteName,
  }
  const noindex =
    !runtimeSettings().indexable ||
    path === '/search' ||
    seo.noindex ||
    (doc?.status && doc.status !== 'published')
  return {
    title,
    description,
    metadataBase: new URL(site.siteUrl),
    alternates: { canonical },
    robots: { index: !noindex, follow: !path.startsWith('/admin') },
    openGraph: {
      title,
      description,
      url: canonical,
      type: kind ? 'article' : 'website',
      siteName: site.siteName,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    ...(c
      ? {
          other: {
            'article:published_time': c.created,
            'article:modified_time': doc.updatedAt,
          },
        }
      : {}),
  }
}
export function JsonLd({
  site,
  path,
  content,
  modified,
}: {
  site: any
  path: string
  content: any
  modified?: string
}) {
  const recipe = path.startsWith('/recipes/')
  const c = content
  const data: any = {
    '@context': 'https://schema.org',
    '@type': recipe ? 'Recipe' : 'Article',
    name: c.title,
    headline: c.title,
    description: c.description,
    url: new URL(path, site.siteUrl).href,
    author: { '@type': 'Person', name: site.copy.jsonLdAuthor },
    datePublished: c.created,
    dateModified: modified,
  }
  if (c.image)
    data.image = new URL(
      c.image.startsWith('/') ? c.image : '/images/' + c.image,
      site.siteUrl,
    ).href
  if (recipe) {
    const blocks = c.blocks.filter((b: any) => b.type === 'recipe')
    data.recipeIngredient = blocks.flatMap((b: any) =>
      b.ingredients.flatMap((s: any) => s.items.map(stripTags)),
    )
    data.recipeInstructions = blocks.flatMap((b: any) =>
      b.steps.flatMap((s: any) =>
        s.items.map((i: string) => ({
          '@type': 'HowToStep',
          text: stripTags(i),
        })),
      ),
    )
    for (const [key, value] of [
      ['prepTime', c.prepMinutes],
      ['cookTime', c.cookMinutes],
      ['totalTime', c.totalMinutes],
    ])
      if (isoDuration(value)) data[key] = isoDuration(value)
    const yieldValue = formatYield(c.yieldAmount, c.yieldUnit)
    if (yieldValue) data.recipeYield = yieldValue
    if (c.courses.length) data.recipeCategory = c.courses.map(labelize)
    if (c.cuisines.length) data.recipeCuisine = c.cuisines.map(labelize)
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site.siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: recipe ? 'Recipes' : 'Learn',
        item: new URL(recipe ? '/recipes' : '/learn', site.siteUrl).href,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: c.title,
        item: new URL(path, site.siteUrl).href,
      },
    ],
  }
  return (
    <>
      {[data, breadcrumbs].map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(d).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  )
}
