import { notFound } from 'next/navigation'
import { KitchenFormulaClient } from '../../../../../next/kitchen'
import { kitchenMetadata, kitchenRecipeContent, validFormulaId } from '../../shared'

type RouteProps = { params: Promise<{ recipe: string; formula: string }> }

// The formula's name is private and loads after hydration, so the title names the section.
export const generateMetadata = kitchenMetadata('Your formula · Notebook')

export default async function Page({ params }: RouteProps) {
  const { recipe: slug, formula } = await params
  if (!validFormulaId(formula)) notFound()
  return <KitchenFormulaClient recipe={await kitchenRecipeContent(slug)} formulaId={formula} />
}
