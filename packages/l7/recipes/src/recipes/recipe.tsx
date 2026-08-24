import { RecipeCard } from '@eat-yeet/l6-ui-catalog/cards'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import type { PageBlockRegistry, RecipePageBlockContext } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { RecipeContent as Recipe } from '@eat-yeet/l4-content-model/recipes'

function BrowseRecipesAside({
  currentRecipe,
  cookMode,
  recipes,
}: {
  currentRecipe: Recipe
  cookMode: boolean
  recipes: RecipeSummary[]
}) {
  const suggestions = recipes.filter((candidate) => candidate.slug !== currentRecipe.slug).slice(0, 4)

  if (suggestions.length === 0) return null

  return (
    <aside
      data-yeet-browse=""
      aria-label="Browse recipes"
      className={`sticky top-24 block max-[1080px]:hidden ${cookMode ? 'hidden' : ''}`}
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

export function RecipeDetail({
  recipe,
  browseRecipes,
  siteUrl,
  blockRegistry,
}: {
  recipe: Recipe
  browseRecipes: RecipeSummary[]
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
}) {
  return (
    <ContentPageArticle
      page={recipe}
      siteUrl={siteUrl}
      blockRegistry={blockRegistry}
      aside={({ page, cookMode }) => (
        <BrowseRecipesAside currentRecipe={page} cookMode={cookMode} recipes={browseRecipes} />
      )}
    />
  )
}
