'use client'
import type { ReactNode } from 'react'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import type { RecipeContent as Recipe } from '@eat-yeet/l4-content-model/recipes'
import { RecipeArticle } from './recipe-article'
import type { RecipePageBlockContext } from './recipe-blocks'

export function RecipeDetail({
  recipe,
  siteUrl,
  blockRegistry,
  beforeIngredients,
  rating,
}: {
  recipe: Recipe
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
  beforeIngredients?: ReactNode
  rating?: ReactNode
}) {
  return (
    <RecipeArticle
      page={recipe}
      siteUrl={siteUrl}
      blockRegistry={blockRegistry}
      beforeIngredients={beforeIngredients}
      rating={rating}
    />
  )
}
