import { cache } from 'react'
import { notFound } from 'next/navigation'
import { publicDocument, siteData, services } from '../../../next/cms'
import { metadataFor, JsonLd } from '../../../next/seo'
import { SearchClient, RecipeClient } from '../../../next/interactive'
import { HomePage } from '@eat-yeet/l7-home/home/home'
import { RecipeGrid, BrowseCard } from '@eat-yeet/l6-ui-catalog/cards'
import {
  LearnIndexPage,
  ArticleDetailPage,
} from '@eat-yeet/l7-learn/learn/learn'
import { recipesInCategory } from '@eat-yeet/l2-recipe-domain/search'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
const pathFor = (parts?: string[]) => '/' + (parts?.join('/') || '')
const documentFor = cache(async (path: string) => {
  const match = path.match(/^\/(recipes|learn)\/([^/]+)$/)
  if (!match) {
    if (!['/', '/recipes', '/learn', '/browse', '/search'].includes(path))
      notFound()
    return null
  }
  const document = await publicDocument(match[1] === 'learn' ? 'articles' : 'recipes', match[2])
  if (!document) notFound()
  return document
})
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>
}) {
  const path = pathFor((await params).path)
  return metadataFor(await siteData(), path, await documentFor(path))
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const path = pathFor((await params).path),
    site = await siteData(),
    api = await services()
  const [{ recipes }, { articles }, doc] = await Promise.all([
    api.recipes.listRecipes(),
    api.articles.listArticles(),
    documentFor(path),
  ])
  const query = await searchParams
  const copy = site.copy
  if (doc) {
    const content = doc.content as any
    return (
      <>
        <JsonLd
          site={site}
          path={path}
          content={content}
          modified={doc.updatedAt}
        />
        {path.startsWith('/recipes/') ? (
          <RecipeClient
            recipe={content}
            recipes={recipes}
            siteUrl={site.siteUrl}
            serializedConfig={
              typeof query.config === 'string' ? query.config : undefined
            }
          />
        ) : (
          <ArticleDetailPage article={content} articles={articles} />
        )}
      </>
    )
  }
  if (path === '/')
    return (
      <HomePage
        copy={copy}
        categories={site.categories}
        latestRecipes={recipes.slice(0, 6)}
      />
    )
  if (path === '/recipes')
    return (
      <div className="mx-auto max-w-[var(--max-width)] px-6 pt-8 pb-20 md:px-8">
        <div className="mb-8">
          <h1 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold text-ink">
            {copy.pages.recipesHeading}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/65">
            {copy.pages.recipesIntro}
          </p>
        </div>
        <RecipeGrid recipes={recipes} />
      </div>
    )
  if (path === '/learn')
    return <LearnIndexPage articles={articles} copy={copy} />
  if (path === '/search') return <SearchClient recipes={recipes} />
  if (path === '/browse') {
    const sections = site.browseSections
    const used = new Set<string>()
    return (
      <div className="mx-auto max-w-[var(--max-width)] px-8 py-16 max-sm:px-4">
        <h1 className="text-center font-display text-4xl font-extrabold text-ink max-sm:text-3xl">
          {copy.pages.browseHeading}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-ink/65">
          {copy.pages.browseIntro}
        </p>
        <div className="mt-12 space-y-14">
          {sections.map((section: any, sectionIndex: number) => {
            const cards = site.categories
              .filter((c: any) => c.facet === section.facet)
              .flatMap((category: any) => {
                const items = recipesInCategory(recipes, category)
                if (!items.length) return []
                if (category.image) return [{ category, image: category.image }]
                const recipe = items.find((r) => !used.has(r.image)) || items[0]
                used.add(recipe.image)
                return [{ category, image: imageUrl(recipe) }]
              })
            return cards.length ? (
              <section key={section.facet} aria-label={section.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-support-strong">
                  {section.eyebrow}
                </p>
                <h2 className="mb-6 font-display text-2xl font-extrabold text-ink">
                  {section.title}
                </h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {cards.map(({ category, image }: any, cardIndex: number) => (
                    <BrowseCard
                      priority={sectionIndex === 0 && cardIndex === 2}
                      eager={sectionIndex === 0 && cardIndex < 4}
                      key={category.slug}
                      label={category.label}
                      imageUrl={image}
                      search={{ [category.facet]: [category.value] }}
                    />
                  ))}
                </div>
              </section>
            ) : null
          })}
        </div>
      </div>
    )
  }
  notFound()
}
