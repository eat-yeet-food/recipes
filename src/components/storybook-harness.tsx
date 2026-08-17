import { BrowseCard, RecipeCard, RecipeGrid, SectionHeading } from './layout'
import { ButternutRecipeTrial } from './recipe-butternut-trial'
import { categorySearch } from './home'
import { CATEGORIES } from '../lib/categories'
import { INDEX, type Recipe } from '../lib/recipes'

function StorySection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section data-storybook-section="">
      <p data-storybook-eyebrow="">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function StorybookHarness({ recipe }: { recipe: Recipe }) {
  const featuredCategories = CATEGORIES.filter((category) => category.featured && category.image).slice(0, 6)
  const featuredRecipes = INDEX.slice(0, 6)

  return (
    <div data-storybook="">
      <header data-storybook-header="">
        <p data-storybook-eyebrow="">Eat / Yeet Harness</p>
        <h1>Storybook</h1>
        <p>
          Static component states rendered with production data, production CSS,
          and the same prerender path as the deployed site.
        </p>
      </header>

      <StorySection eyebrow="Typography" title="Section Heading">
        <div data-storybook-surface="">
          <SectionHeading eyebrow="Top Eats" title="Latest Recipes" />
        </div>
      </StorySection>

      <StorySection eyebrow="Cards" title="Recipe Cards">
        <div data-storybook-card-row="">
          {featuredRecipes.slice(0, 3).map((item) => (
            <RecipeCard key={item.slug} recipe={item} />
          ))}
        </div>
      </StorySection>

      <StorySection eyebrow="Cards" title="Browse Gallery">
        <div data-storybook-card-row="">
          {featuredCategories.slice(0, 3).map((category) => (
            <BrowseCard
              key={category.slug}
              label={category.label}
              imageUrl={category.image ?? ''}
              search={categorySearch(category)}
            />
          ))}
        </div>
      </StorySection>

      <StorySection eyebrow="Grid" title="Empty and Filled Recipe Grids">
        <div data-storybook-stack="">
          <RecipeGrid recipes={[]} />
          <RecipeGrid recipes={featuredRecipes} />
        </div>
      </StorySection>

      <StorySection eyebrow="Recipe" title="Canonical Recipe Article">
        <div data-storybook-recipe-frame="">
          <ButternutRecipeTrial recipe={recipe} showOriginalLink={false} />
        </div>
      </StorySection>
    </div>
  )
}
