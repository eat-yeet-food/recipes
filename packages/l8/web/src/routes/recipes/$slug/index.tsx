import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'

import { RecipeDetail } from '@eat-yeet/l7-recipes/recipes/recipe'
import { isoDuration, formatYield, labelize, stripTags } from '@eat-yeet/l2-recipe-domain/format'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import { pageBlockRegistry } from '@app/page-blocks'
import { APP_CONFIG } from '@/lib/app-config'
import {
  recipeWithSelectedVariant,
  selectedRecipeVariant,
  type RecipeBlock,
  type RecipeContent as Recipe,
} from '@eat-yeet/l4-content-model/recipes'
import { buildSeoMeta } from '@/lib/seo'
import { recipeApi, recipeQueries } from '@/lib/api'

const APP_COPY = APP_CONFIG.copy

export interface RecipeUrl {
  variant?: string
}

const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

function validateSearch(search: Record<string, unknown>): RecipeUrl {
  const variant = str(search.variant)
  return variant ? { variant } : {}
}

export const Route = createFileRoute('/recipes/$slug/')({
  validateSearch,
  loader: async ({ context, params }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(recipeQueries.list()))
    const { recipe } = await context.queryClient.ensureQueryData(recipeQueries.detail(params.slug))
    if (!recipe) throw notFound()
    return recipe
  },
  head: ({ loaderData, params }) => {
    const recipe = loaderData as Recipe | undefined
    const photo = recipe ? imageUrl(recipe) : ''
    return buildSeoMeta({
      title: recipe ? `${recipe.title} | ${APP_COPY.pages.recipeTitleSuffix}` : APP_COPY.pages.recipeFallbackTitle,
      description:
        recipe?.description || `View the recipe for ${params.slug.replace(/-/g, ' ')}.`,
      canonicalPath: `/recipes/${params.slug}`,
      ogType: 'article',
      // If a future fixture has no photo, buildSeoMeta falls back to the site
      // image rather than implying a dish photo that does not exist.
      ogImage: photo || undefined,
    }, APP_CONFIG)
  },
  component: RecipeRoute,
})

/**
 * schema.org Recipe JSON-LD for search rich results. A recipe with no photo
 * emits no `image` and simply will not qualify, which is the honest outcome.
 */
function RecipeJsonLd({ recipe }: { recipe: Recipe }) {
  const photo = imageUrl(recipe)
  const recipeBlocks = recipe.blocks.filter((block): block is RecipeBlock => block.type === 'recipe')
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    url: `${APP_CONFIG.siteUrl}/recipes/${recipe.slug}`,
    author: { '@type': 'Person', name: APP_COPY.jsonLdAuthor },
    recipeIngredient: recipeBlocks.flatMap((block) =>
      block.ingredients.flatMap((s) => s.items.map(stripTags)),
    ),
    recipeInstructions: recipeBlocks.flatMap((block) => block.steps.flatMap((s) =>
      s.items.map((item) => ({ '@type': 'HowToStep', text: stripTags(item) })),
    )),
  }

  if (photo) jsonLd.image = `${APP_CONFIG.siteUrl}${photo}`
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
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data } = recipeApi.useList()
  const selectedVariant = selectedRecipeVariant(recipe, search.variant)
  const selectedRecipe = recipeWithSelectedVariant(recipe, search.variant)
  const selectedVariantId = selectedVariant?.id ?? ''

  const setVariant = (variantId: string) => {
    void navigate({
      search: variantId === recipe.defaultVariant ? {} : { variant: variantId },
    })
  }

  return (
    <>
      <RecipeJsonLd recipe={selectedRecipe} />
      <RecipeDetail
        recipe={selectedRecipe}
        browseRecipes={data?.recipes ?? []}
        siteUrl={APP_CONFIG.siteUrl}
        blockRegistry={pageBlockRegistry}
        variantOptions={recipe.variants}
        selectedVariantId={selectedVariantId}
        onVariantChange={setVariant}
      />
    </>
  )
}
