'use client'
import { RecipeDetail } from '@eat-yeet/l7-recipes/recipes/recipe'
import { authoredRecipe } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { RecipeKitchenLink } from '@eat-yeet/l7-kitchen/kitchen/recipe-kitchen-link'
import { pageBlockRegistry } from '@app/page-blocks'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import { useMemo } from 'react'
import { accountRequest } from './account-client'
import { kitchenClient } from './kitchen-client'
import { RecipeRating, type RatingClient } from '@eat-yeet/l7-recipes/recipes/recipe-rating'
export function RecipeClient({
  recipe,
  recipes,
  siteUrl,
}: {
  recipe: any
  recipes: any[]
  siteUrl: string
}) {
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
  // Recipes render as written; the calculator's authored default fills in dough weights and bound steps.
  const page = useMemo(() => authoredRecipe(recipe, recipeWorkbenchRegistry), [recipe])
  return (
    <RecipeDetail
      recipe={page}
      browseRecipes={recipes}
      siteUrl={siteUrl}
      blockRegistry={pageBlockRegistry}
      beforeIngredients={recipe.workbench && recipeWorkbenchRegistry.get(recipe.workbench.id) ? <RecipeKitchenLink recipeSlug={recipe.slug} client={kitchenClient} /> : undefined}
      rating={<RecipeRating key={recipe.slug} title={recipe.title} client={ratingClient} />}
    />
  )
}
