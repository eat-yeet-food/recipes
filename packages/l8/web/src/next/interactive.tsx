'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { RecipeDetail } from '@eat-yeet/l7-recipes/recipes/recipe'
import { activateRecipeWorkbench } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { pageBlockRegistry } from '@app/page-blocks'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import { useMemo } from 'react'
import { accountRequest } from './account-client'
import { RecipeRating, type RatingClient } from '@eat-yeet/l7-recipes/recipes/recipe-rating'
export function RecipeClient({
  recipe,
  recipes,
  siteUrl,
  serializedConfig = '',
}: {
  recipe: any
  recipes: any[]
  siteUrl: string
  serializedConfig?: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const ratingClient = useMemo<RatingClient>(() => {
    const path = `/ratings/${encodeURIComponent(recipe.slug)}`
    return {
      read: () => accountRequest(path, 'GET', undefined, 'Ratings are unavailable. Please try again.'),
      save: (input) => accountRequest(path, 'PUT', input, 'Your rating could not be saved. Please try again.'),
      remove: () => accountRequest(path, 'DELETE', undefined, 'Your rating could not be deleted. Please try again.'),
      reply: (input) => accountRequest(`${path}/replies`, 'POST', input, 'Your reply could not be posted. Please try again.'),
      removeReply: (replyId) => accountRequest(`${path}/replies/${encodeURIComponent(replyId)}`, 'DELETE', undefined, 'Your reply could not be deleted. Please try again.'),
    }
  }, [recipe.slug])
  // Browser Back updates the URL before a new server response arrives. Read the
  // current query so formulas restore immediately, including an empty query.
  const raw = params ? params.get('config') ?? '' : serializedConfig
  const workbench = activateRecipeWorkbench(
    recipe,
    recipeWorkbenchRegistry,
    raw.length < 12000 ? raw : undefined,
  )
  const selected = workbench
    ? workbench.plugin.resolveRecipe(recipe, workbench.config, workbench.state)
    : recipe
  return (
    <RecipeDetail
      recipe={selected}
      browseRecipes={recipes}
      siteUrl={siteUrl}
      blockRegistry={pageBlockRegistry}
      workbench={workbench}
      onWorkbenchApply={(next) =>
        router.push(
          `/recipes/${recipe.slug}?config=${encodeURIComponent(JSON.stringify(next))}`,
          { scroll: false },
        )
      }
      storageScope={new URL(siteUrl).hostname}
      rating={<RecipeRating key={recipe.slug} title={recipe.title} client={ratingClient} />}
    />
  )
}
