'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchPage } from '@eat-yeet/l7-search/search/search'
import { emptySearch, FACET_KEYS } from '@eat-yeet/l2-recipe-domain/search'
import { RecipeDetail } from '@eat-yeet/l7-recipes/recipes/recipe'
import { activateRecipeWorkbench } from '@eat-yeet/l7-recipes/recipes/workbench-registry'
import { pageBlockRegistry } from '@app/page-blocks'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
export function SearchClient({ recipes }: { recipes: any[] }) {
  const router = useRouter(),
    params = useSearchParams(),
    state = emptySearch()
  state.q = params.get('q') ?? ''
  for (const k of FACET_KEYS)
    state[k] = (params.get(k) || '').split(',').filter(Boolean)
  return (
    <SearchPage
      recipes={recipes}
      state={state}
      onChange={(next) => {
        const query = new URLSearchParams()
        if (next.q) query.set('q', next.q)
        for (const k of FACET_KEYS)
          if (next[k].length) query.set(k, next[k].join(','))
        router.replace('/search' + (query.size ? '?' + query : ''), {
          scroll: false,
        })
      }}
    />
  )
}
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
