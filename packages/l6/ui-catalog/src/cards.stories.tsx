import type { ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { SearchParams } from '@eat-yeet/l2-recipe-domain/search'

import { BrowseCard, RecipeCard, RecipeGrid, SectionHeading } from './cards'

const recipes: RecipeSummary[] = [
  {
    slug: 'artisan-new-york-pizza',
    title: 'Artisan New York Pizza',
    description: 'Cold-fermented dough baked hot with tomato sauce and frozen cheese.',
    category: 'mains',
    courses: ['mains'],
    cuisines: ['italian'],
    methods: ['baking'],
    restrictions: [],
    occasions: ['weeknight'],
    ingredientTypes: ['cheese', 'flour'],
    prepMinutes: 45,
    cookMinutes: 12,
    totalMinutes: 72 * 60,
    yieldAmount: 3,
    yieldUnit: 'pizzas',
    image: 'charred-crust-pizza.jpg',
    imageHash: '',
    created: '2026-01-01',
    searchText: 'artisan new york pizza',
  },
  {
    slug: 'brown-butter-chocolate-chip-cookies',
    title: 'Brown Butter Chocolate Chip Cookies',
    description: 'Chewy cookies with nutty brown butter and crisp edges.',
    category: 'desserts',
    courses: ['desserts'],
    cuisines: ['american'],
    methods: ['baking'],
    restrictions: ['vegetarian'],
    occasions: ['party'],
    ingredientTypes: ['chocolate'],
    prepMinutes: 25,
    cookMinutes: 11,
    totalMinutes: 90,
    yieldAmount: 18,
    yieldUnit: 'cookies',
    image: 'brown-butter-chocolate-chip-cookies.jpg',
    imageHash: '',
    created: '2026-01-02',
    searchText: 'brown butter chocolate chip cookies',
  },
  {
    slug: 'raised-donuts',
    title: 'Raised Donuts',
    description: 'Light yeast donuts finished with vanilla glaze.',
    category: 'desserts',
    courses: ['breakfast', 'desserts'],
    cuisines: ['american'],
    methods: ['frying'],
    restrictions: ['vegetarian'],
    occasions: ['weekend'],
    ingredientTypes: ['flour'],
    prepMinutes: 40,
    cookMinutes: 20,
    totalMinutes: 180,
    yieldAmount: 12,
    yieldUnit: 'donuts',
    image: 'raised-donuts.jpg',
    imageHash: '',
    created: '2026-01-03',
    searchText: 'raised donuts',
  },
]

const categories: Array<{ label: string; imageUrl: string; search: SearchParams }> = [
  { label: 'Baking', imageUrl: '/images/categories/baking.webp', search: { methods: 'baking' } },
  { label: 'Mains', imageUrl: '/images/categories/mains.webp', search: { category: 'mains' } },
  { label: 'Desserts', imageUrl: '/images/categories/desserts.webp', search: { category: 'desserts' } },
]

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
  title: 'Catalog/Cards',
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
