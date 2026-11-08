import type { Meta, StoryObj } from '@storybook/react-vite'
import { BrowseCard, RecipeGrid } from '@eat-yeet/l6-ui-catalog/cards'
import { fixtureCategories, fixtureRecipes } from '@eat-yeet/l6-ui-catalog/catalog-fixtures'
import { Eyebrow, PageTitle } from '@eat-yeet/l5-ui-primitives/primitives/typography'

function RecipesIndex() {
  return <div className="mx-auto max-w-[var(--max-width)] px-6 pt-8 pb-20 md:px-8">
    <PageTitle>All Recipes</PageTitle>
    <p className="mt-3 mb-8 max-w-lg text-sm leading-relaxed text-muted-foreground">Every recipe, newest first.</p>
    <RecipeGrid recipes={fixtureRecipes} />
  </div>
}
function Browse() {
  return <div className="mx-auto max-w-[var(--max-width)] px-8 py-16 max-sm:px-4">
    <PageTitle className="text-center">Browse</PageTitle>
    <section aria-label="Courses" className="mt-10">
      <Eyebrow className="mb-2">Courses</Eyebrow>
      <h2 className="mb-6 font-display text-2xl font-extrabold text-ink">What are you making?</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{fixtureCategories.map((c) => <BrowseCard key={c.label} {...c} />)}</div>
    </section>
  </div>
}
const meta = { title: 'Pages', component: RecipesIndex, parameters: { layout: 'fullscreen', docs: { description: { component: 'Full page compositions from shared parts. The full recipe page renders in Features/Remix/Pages (Bake Sheet), which composes the production RecipeArticle with the app’s block registry.' } } } } satisfies Meta<typeof RecipesIndex>
export default meta
export const RecipesIndexPage: StoryObj<typeof meta> = { name: 'Recipes Index' }
export const BrowsePage: StoryObj<typeof meta> = { name: 'Browse', render: () => <Browse /> }
