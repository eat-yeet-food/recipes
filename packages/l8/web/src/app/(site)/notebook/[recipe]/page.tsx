import { KitchenScratchClient } from '../../../../next/kitchen'
import { first, kitchenMetadata, kitchenRecipeContent, type KitchenSearch } from '../shared'

type RouteProps = { params: Promise<{ recipe: string }>; searchParams: KitchenSearch }

export async function generateMetadata({ params }: RouteProps) {
  const recipe = await kitchenRecipeContent((await params).recipe)
  return kitchenMetadata(`${recipe.title} · Notebook`)()
}

export default async function Page({ params, searchParams }: RouteProps) {
  const [{ recipe: slug }, query] = await Promise.all([params, searchParams])
  return <KitchenScratchClient recipe={await kitchenRecipeContent(slug)} sharedConfig={first(query.config)} save={first(query.save) === '1'} />
}
