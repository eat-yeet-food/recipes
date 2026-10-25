import { publicDocument, services } from '../../../next/cms'
import { KitchenLibraryClient } from '../../../next/kitchen'
import { first, kitchenMetadata, type KitchenSearch } from './shared'

export const generateMetadata = kitchenMetadata('Notebook')

export default async function Page({ searchParams }: { searchParams: KitchenSearch }) {
  const [{ recipes }, params] = await Promise.all([(await services()).recipes.listRecipes(), searchParams])
  const documents = await Promise.all(recipes.filter((recipe) => recipe.workbench).map((recipe) => publicDocument('recipes', recipe.slug)))
  const content = documents.flatMap((document) => document ? [{ ...(document.content as any), searchText: '' }] : [])
  return <KitchenLibraryClient recipes={content} deletedId={first(params.deleted)} />
}
