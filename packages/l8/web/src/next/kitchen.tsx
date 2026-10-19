'use client'
import { useMemo } from 'react'
import { pageBlockRegistry } from '@app/page-blocks'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { KitchenFormulaBakePage, KitchenScratchBakePage } from '@eat-yeet/l7-kitchen/kitchen/kitchen-bake'
import { KitchenFormulaPage } from '@eat-yeet/l7-kitchen/kitchen/kitchen-formula'
import { KitchenLibraryPage } from '@eat-yeet/l7-kitchen/kitchen/kitchen-library'
import { kitchenRecipe, type KitchenRecipe } from '@eat-yeet/l7-kitchen/kitchen/kitchen-plugin'
import { KitchenScratchPage } from '@eat-yeet/l7-kitchen/kitchen/kitchen-scratch'
import { kitchenClient } from './kitchen-client'

// Test Kitchen pages render public recipe data on the server; everything a
// member owns loads here, after hydration, through the account API.
const useKitchen = (recipe: RecipeContent) => useMemo(() => kitchenRecipe(recipe, recipeWorkbenchRegistry), [recipe])

export function KitchenLibraryClient({ recipes, deletedId }: { recipes: RecipeContent[]; deletedId?: string }) {
  const kitchens = useMemo(() => recipes.map((recipe) => kitchenRecipe(recipe, recipeWorkbenchRegistry)).filter((kitchen): kitchen is KitchenRecipe => kitchen !== null), [recipes])
  return <KitchenLibraryPage recipes={kitchens} client={kitchenClient} deletedId={deletedId} />
}

export function KitchenScratchClient({ recipe, sharedConfig, save }: { recipe: RecipeContent; sharedConfig?: string; save: boolean }) {
  const kitchen = useKitchen(recipe)
  return kitchen ? <KitchenScratchPage kitchen={kitchen} client={kitchenClient} sharedConfig={sharedConfig} saveOnArrival={save} /> : null
}

export function KitchenFormulaClient({ recipe, formulaId }: { recipe: RecipeContent; formulaId: string }) {
  const kitchen = useKitchen(recipe)
  return kitchen ? <KitchenFormulaPage key={formulaId} kitchen={kitchen} formulaId={formulaId} client={kitchenClient} /> : null
}

export function KitchenBakeClient({ recipe, formulaId, siteUrl, count }: { recipe: RecipeContent; formulaId?: string; siteUrl: string; count?: number }) {
  const kitchen = useKitchen(recipe)
  if (!kitchen) return null
  return formulaId
    ? <KitchenFormulaBakePage kitchen={kitchen} formulaId={formulaId} client={kitchenClient} siteUrl={siteUrl} blockRegistry={pageBlockRegistry} initialCount={count} />
    : <KitchenScratchBakePage kitchen={kitchen} siteUrl={siteUrl} blockRegistry={pageBlockRegistry} initialCount={count} />
}

