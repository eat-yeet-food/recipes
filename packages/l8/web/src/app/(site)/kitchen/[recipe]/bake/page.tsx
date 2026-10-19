import { siteData } from '../../../../../next/cms'
import { KitchenBakeClient } from '../../../../../next/kitchen'
import { first, kitchenMetadata, kitchenRecipeContent, todayCount, type KitchenSearch } from '../../shared'

type RouteProps = { params: Promise<{ recipe: string }>; searchParams: KitchenSearch }

export async function generateMetadata({ params }: RouteProps) {
  const recipe = await kitchenRecipeContent((await params).recipe)
  return kitchenMetadata(`Bake sheet · ${recipe.title}`)()
}

export default async function Page({ params, searchParams }: RouteProps) {
  const [{ recipe: slug }, query, site] = await Promise.all([params, searchParams, siteData()])
  return <KitchenBakeClient recipe={await kitchenRecipeContent(slug)} siteUrl={site.siteUrl} count={todayCount(first(query.count))} />
}
