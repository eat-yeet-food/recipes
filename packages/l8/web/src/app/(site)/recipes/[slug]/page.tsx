import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { publicDocument, siteData, services } from '../../../../next/cms'
import { metadataFor, JsonLd } from '../../../../next/seo'
import { RecipeClient } from '../../../../next/interactive'

const recipeFor = cache(async (slug: string) => {
  const document = await publicDocument('recipes', slug)
  if (!document) notFound()
  return document
})
type RouteProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params
  return metadataFor(await siteData(), `/recipes/${slug}`, await recipeFor(slug))
}
export default async function RecipePage({ params, searchParams }: RouteProps) {
  const { slug } = await params
  const [site, doc, { recipes }, query] = await Promise.all([
    siteData(), recipeFor(slug), (await services()).recipes.listRecipes(), searchParams,
  ])
  // Formulas shared before Notebook open there as an unsaved copy.
  if (typeof query.config === 'string' && doc.content.workbench) redirect(`/notebook/${slug}?config=${encodeURIComponent(query.config)}`)
  return <>
    <JsonLd site={site} path={`/recipes/${slug}`} content={doc.content} modified={doc.updatedAt} />
    <RecipeClient recipe={{ ...doc.content, searchText: '' }} recipes={recipes.filter((recipe) => recipe.slug !== slug).slice(0, 4).map((recipe) => ({ ...recipe, searchText: '' }))} siteUrl={site.siteUrl} />
  </>
}
