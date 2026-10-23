'use client'
import { RecipeDetail } from '@eat-yeet/l7-recipes/recipes/recipe'
import { authoredRecipe } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { RecipeKitchenLink } from '@eat-yeet/l7-kitchen/kitchen/recipe-kitchen-link'
import { TodayBatch, useTodayCount } from '@eat-yeet/l7-kitchen/kitchen/today-batch'
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
  // The only change a reader makes here is how many pieces to make today (`?count=`).
  const plugin = recipe.workbench ? recipeWorkbenchRegistry.get(recipe.workbench.id) : undefined
  const authored = useMemo(() => plugin ? plugin.defaultState(recipe.workbench.config) : null, [plugin, recipe])
  const usual = plugin && authored !== null ? plugin.batchCount(authored) : 1
  const [count, setCount] = useTodayCount(usual)
  const page = useMemo(() => plugin && authored !== null
    ? plugin.resolveRecipe(recipe, recipe.workbench.config, plugin.withBatchCount(authored, count))
    : authoredRecipe(recipe, recipeWorkbenchRegistry), [plugin, authored, recipe, count])
  return (
    <RecipeDetail
      recipe={page}
      browseRecipes={recipes}
      siteUrl={siteUrl}
      blockRegistry={pageBlockRegistry}
      beforeIngredients={plugin && authored !== null ? <>
        <TodayBatch count={count} usual={usual} noun={plugin.batchNoun(authored, count)} plural={plugin.batchNoun(authored, 2)} onChange={setCount}
          usualNote="The batch as written." changedNote={`Just this bake. The recipe makes ${usual}.`} />
        <RecipeKitchenLink recipeSlug={recipe.slug} client={kitchenClient} />
      </> : undefined}
      rating={<RecipeRating key={recipe.slug} title={recipe.title} client={ratingClient} />}
    />
  )
}
