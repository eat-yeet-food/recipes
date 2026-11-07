import type { ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { ArticleCard, BrowseCard, RecipeCard, RecipeGrid, SectionHeading } from './cards'

import { fixtureArticles as articles, fixtureCategories as categories, fixtureRecipes as recipes } from './catalog-fixtures'

function StorySection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section data-storybook-section="">
      <p data-storybook-eyebrow="">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StoryCanvas({ children }: { children: ReactNode }) {
  return <div data-storybook="">{children}</div>
}

const meta = {
  title: 'Patterns/Catalog Cards',
  subcomponents: { RecipeCard },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SectionHeadingStory: Story = {
  name: 'Section Heading',
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Typography" title="Section Heading">
        <div data-storybook-surface="">
          <SectionHeading eyebrow="Top Eats" title="Latest Recipes" />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const RecipeCards: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Cards" title="Recipe Cards">
        <div data-storybook-card-row="">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const BrowseCards: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Cards" title="Browse Gallery">
        <div data-storybook-card-row="">
          {categories.map((category) => (
            <BrowseCard
              key={category.label}
              label={category.label}
              imageUrl={category.imageUrl}
              search={category.search}
            />
          ))}
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const ArticleCards: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Cards" title="Article Cards">
        <div data-storybook-card-row="">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
        <div className="mt-8 grid max-w-[300px] gap-[26px]">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const RecipeGridStates: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Grid" title="Empty and Filled Recipe Grids">
        <div data-storybook-stack="">
          <RecipeGrid recipes={[]} />
          <RecipeGrid recipes={recipes} />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}
