'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { RecipeDetail } from '@eat-yeet/l7-recipes/recipes/recipe'
import { activateRecipeWorkbench } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { pageBlockRegistry } from '@app/page-blocks'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import { useMemo } from 'react'
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
    const url = `/api/public/ratings/${encodeURIComponent(recipe.slug)}`
    async function request(input?: Record<string, unknown>) {
      const response = await fetch(url, { method: input === undefined ? 'GET' : 'POST', cache: 'no-store',
        credentials: 'same-origin', headers: input === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: input === undefined ? undefined : JSON.stringify(input) })
      const body = await response.json().catch(() => { throw new Error('Ratings are unavailable. Please try again.') })
      if (!response.ok) throw new Error(body.error || 'Your rating could not be saved. Please try again.')
      return body
    }
    return {
      read: () => request(),
      save: (input) => request({ kind: 'rating', ...input }),
      reply: (input) => request({ kind: 'reply', ...input }),
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
