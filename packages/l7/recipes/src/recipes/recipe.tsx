import { RecipeCard } from '@eat-yeet/l6-ui-catalog/cards'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import type { RecipeSummary, RecipeVariantSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { RecipeContent as Recipe } from '@eat-yeet/l4-content-model/recipes'
import { RecipeArticle } from './recipe-article'
import type { RecipePageBlockContext } from './recipe-blocks'

function BrowseRecipesAside({
  suggestions,
}: {
  suggestions: RecipeSummary[]
}) {
  return (
    <aside
      data-yeet-browse=""
      aria-label="Browse recipes"
      className="sticky top-24 block max-[1080px]:hidden"
    >
      <div className="mb-[22px] text-[var(--yeet-gray)] font-[family-name:var(--yeet-serif)] text-[36px] font-bold tracking-[0.8px] leading-[1.05] text-center">
        <span>Browse</span>
        {' '}
        <strong className="font-bold">Recipes</strong>
      </div>
      <div className="grid gap-[26px]">
        {suggestions.map((recipe: RecipeSummary) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
      </div>
    </aside>
  )
}

function getBrowseRecipeSuggestions(currentRecipe: Recipe, recipes: RecipeSummary[]) {
  return recipes.filter((candidate) => candidate.slug !== currentRecipe.slug).slice(0, 4)
}

export function RecipeDetail({
  recipe,
  browseRecipes,
  siteUrl,
  blockRegistry,
  variantOptions,
  selectedVariantId,
  onVariantChange,
}: {
  recipe: Recipe
  browseRecipes: RecipeSummary[]
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
  variantOptions?: RecipeVariantSummary[]
  selectedVariantId?: string
  onVariantChange?: (variantId: string) => void
}) {
  return (
    <RecipeArticle
      page={recipe}
      siteUrl={siteUrl}
      blockRegistry={blockRegistry}
      variantOptions={variantOptions}
      selectedVariantId={selectedVariantId}
      onVariantChange={onVariantChange}
      aside={({ page, cookMode }) => {
        const suggestions = getBrowseRecipeSuggestions(page, browseRecipes)

        if (cookMode || suggestions.length === 0) return null

        return <BrowseRecipesAside suggestions={suggestions} />
      }}
    />
  )
}
