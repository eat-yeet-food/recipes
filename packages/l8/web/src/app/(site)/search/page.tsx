import { siteData, services } from '../../../next/cms'
import { metadataFor } from '../../../next/seo'
import { SearchClient } from '../../../next/search-client'

export async function generateMetadata() {
  return metadataFor(await siteData(), '/search', null)
}
export default async function SearchPage() {
  const { recipes } = await (await services()).recipes.listRecipes()
  return <SearchClient recipes={recipes} />
}
