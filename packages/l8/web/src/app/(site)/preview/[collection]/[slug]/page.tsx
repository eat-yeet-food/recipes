import { storedContent } from '@eat-yeet/l4-content-model/storage'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { cms, siteData, services, deliveryMedia } from '../../../../../next/cms'
import { RecipeClient } from '../../../../../next/interactive'
import { ArticleDetailPage } from '@eat-yeet/l7-learn/learn/learn'
import { MediaProvider } from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
import { isOwner } from '@eat-yeet/l4-content-cms/config'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Private content preview',
  robots: { index: false, follow: false },
}
export default async function Preview({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>
}) {
  const { collection, slug } = await params
  if (!['recipes', 'articles'].includes(collection)) notFound()
  const payload = await cms(),
    { user } = await payload.auth({ headers: await headers() })
  if (!isOwner(user)) notFound()
  const { docs } = await payload.find({
    collection,
    overrideAccess: false,
    user,
    depth: 0,
    limit: 1,
    where: { slug: { equals: slug } },
  })
  if (!docs[0]) notFound()
  const site = await siteData()
  const { docs: images } = await payload.find({
    collection: 'media',
    overrideAccess: false,
    user,
    depth: 0,
    pagination: false,
  })
  const media: Record<string, any> = {}
  for (const image of images) {
    const m = image.manifest as any
    for (const name of m.names) {
      if (storedContent(docs[0]).mediaReferences?.[name] === m.hash)
        media['/images/' + name] = m
    }
  }
  const api = await services(),
    { recipes } = await api.recipes.listRecipes(),
    { articles } = await api.articles.listArticles()
  return (
    <MediaProvider media={deliveryMedia(media)}>
      <p
        role="status"
        className="mx-auto max-w-[var(--max-width)] px-6 py-4 text-sm"
      >
        Private preview — publish by updating Git and synchronizing.
      </p>
      {collection === 'recipes' ? (
        <Suspense>
          <RecipeClient
            recipe={storedContent(docs[0])}
            recipes={recipes}
            siteUrl={site.siteUrl}
          />
        </Suspense>
      ) : (
        <ArticleDetailPage
          article={storedContent(docs[0])}
          articles={articles}
        />
      )}
    </MediaProvider>
  )
}
