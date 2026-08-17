import { createFileRoute, notFound } from '@tanstack/react-router'

import { ButternutRecipeTrial } from '../../../components/recipe-butternut-trial'
import { loadRecipe, imageUrl, type Recipe } from '../../../lib/recipes'
import { buildSeoMeta } from '../../../lib/seo'

export const Route = createFileRoute('/recipes/$slug/butternut-trial')({
  loader: async ({ params }) => {
    const recipe = await loadRecipe(params.slug)
    if (!recipe) throw notFound()
    return recipe
  },
  head: ({ loaderData, params }) => {
    const recipe = loaderData as Recipe | undefined
    const title = recipe ? `${recipe.title} Layout Trial | Eat / Yeet` : 'Recipe Layout Trial | Eat / Yeet'
    return buildSeoMeta({
      title,
      description:
        recipe?.description || `View the layout trial for ${params.slug.replace(/-/g, ' ')}.`,
      canonicalPath: `/recipes/${params.slug}`,
      ogType: 'article',
      ogImage: recipe ? imageUrl(recipe) || undefined : undefined,
      noindex: true,
    })
  },
  component: TrialRoute,
})

function TrialRoute() {
  const recipe = Route.useLoaderData()
  return <ButternutRecipeTrial recipe={recipe} />
}
