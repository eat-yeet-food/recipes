import { notFound } from 'next/navigation'
import { siteData } from '../../../../../../next/cms'
import { KitchenBakeClient } from '../../../../../../next/kitchen'
import { first, kitchenMetadata, kitchenRecipeContent, todayCount, validFormulaId, type KitchenSearch } from '../../../shared'

type RouteProps = { params: Promise<{ recipe: string; formula: string }>; searchParams: KitchenSearch }

export const generateMetadata = kitchenMetadata('Bake sheet · Notebook')

export default async function Page({ params, searchParams }: RouteProps) {
  const [{ recipe: slug, formula }, query, site] = await Promise.all([params, searchParams, siteData()])
  if (!validFormulaId(formula)) notFound()
  return <KitchenBakeClient recipe={await kitchenRecipeContent(slug)} formulaId={formula} siteUrl={site.siteUrl} count={todayCount(first(query.count))} />
}
