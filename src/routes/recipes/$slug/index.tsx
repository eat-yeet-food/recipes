import { createFileRoute, notFound } from '@tanstack/react-router'

import { RecipeDetail } from '../../../components/recipe'
import { isoDuration, formatYield, labelize, stripTags } from '../../../lib/format'
import { SITE_URL } from '../../../../site.config.mjs'
import { loadRecipe, imageUrl, type Recipe } from '../../../lib/recipes'
import { buildSeoMeta } from '../../../lib/seo'

export const Route = createFileRoute('/recipes/$slug/')({
  loader: async ({ params }) => {
    const recipe = await loadRecipe(params.slug)
    if (!recipe) throw notFound()
    return recipe
  },
  head: ({ loaderData, params }) => {
    const recipe = loaderData as Recipe | undefined
    const photo = recipe ? imageUrl(recipe) : ''
    return buildSeoMeta({
      title: recipe ? `${recipe.title} | Eat / Yeet` : 'Recipe | Eat / Yeet',
      description:
        recipe?.description || `View the recipe for ${params.slug.replace(/-/g, ' ')}.`,
      canonicalPath: `/recipes/${params.slug}`,
      ogType: 'article',
      // Deliberately left unset for the four recipes whose photos died with the
      // S3 bucket — buildSeoMeta falls back to the site image rather than
      // implying a dish photo that does not exist.
      ogImage: photo || undefined,
    })
  },
  component: RecipeRoute,
})

/**
 * schema.org Recipe, ported from the original's recipe-json-ld.tsx. This is
 * what earns a rich result in search; the four photo-less recipes emit no
 * `image` and simply will not qualify, which is the honest outcome.
 */
function RecipeJsonLd({ recipe }: { recipe: Recipe }) {
  const photo = imageUrl(recipe)
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    url: `${SITE_URL}/recipes/${recipe.slug}`,
    author: { '@type': 'Person', name: 'Patrick Hogan' },
    recipeIngredient: recipe.ingredients.flatMap((s) => s.items.map(stripTags)),
    recipeInstructions: recipe.steps.flatMap((s) =>
      s.items.map((item) => ({ '@type': 'HowToStep', text: stripTags(item) })),
    ),
  }

  if (photo) jsonLd.image = `${SITE_URL}${photo}`
  if (recipe.created) jsonLd.datePublished = recipe.created

  const prep = isoDuration(recipe.prepMinutes)
  const cook = isoDuration(recipe.cookMinutes)
  const total = isoDuration(recipe.totalMinutes)
  if (prep) jsonLd.prepTime = prep
  if (cook) jsonLd.cookTime = cook
  if (total) jsonLd.totalTime = total

  const yields = formatYield(recipe.yieldAmount, recipe.yieldUnit)
  if (yields) jsonLd.recipeYield = yields
  if (recipe.courses.length > 0) jsonLd.recipeCategory = recipe.courses.map(labelize)
  if (recipe.cuisines.length > 0) jsonLd.recipeCuisine = recipe.cuisines.map(labelize)

  const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

function RecipeRoute() {
  const recipe = Route.useLoaderData()
  return (
    <>
      <RecipeJsonLd recipe={recipe} />
      <RecipeDetail recipe={recipe} />
    </>
  )
}
