'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { RecipeDetail } from '@eat-yeet/l7-recipes/recipes/recipe'
import { activateRecipeWorkbench } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { pageBlockRegistry } from '@app/page-blocks'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
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
    />
  )
}
