import type { ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ArticleSummary } from '@eat-yeet/l1-article-model/articles'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
import type { SearchParams } from '@eat-yeet/l2-recipe-domain/search'

import { ArticleCard, BrowseCard, RecipeCard, RecipeGrid, SectionHeading } from './cards'

const recipes: RecipeSummary[] = [
  {
    slug: 'new-york-style-pizza',
    title: 'New York Style Pizza',
    order: null,
    description: 'Cold-fermented dough baked hot with tomato sauce and frozen cheese.',
    category: 'mains',
    defaultVariant: 'outdoor-oven',
    variants: [
      {
        id: 'outdoor-oven',
        label: 'Outdoor Oven',
        description: 'Cold-fermented dough baked hot with tomato sauce and frozen cheese.',
        prepMinutes: 45,
        cookMinutes: 12,
        totalMinutes: 72 * 60,
        yieldAmount: 3,
        yieldUnit: 'pizzas',
      },
      {
        id: 'indoor-steel',
        label: 'Indoor Steel',
        description: 'A home-oven version baked on a steel.',
        prepMinutes: 45,
        cookMinutes: 12,
        totalMinutes: 72 * 60,
        yieldAmount: 3,
        yieldUnit: 'pizzas',
      },
    ],
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
    searchText: 'new york style pizza outdoor oven indoor steel',
  },
  {
    slug: 'brown-butter-chocolate-chip-cookies',
    title: 'Brown Butter Chocolate Chip Cookies',
    order: null,
    description: 'Chewy cookies with nutty brown butter and crisp edges.',
    category: 'desserts',
    defaultVariant: '',
    variants: [],
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
    order: null,
    description: 'Light yeast donuts finished with vanilla glaze.',
    category: 'desserts',
    defaultVariant: '',
    variants: [],
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

const articles: ArticleSummary[] = [
  {
    slug: 'mixing-dough-and-gluten-development',
    title: 'Developing Dough and Mixing Methodologies',
    order: 1,
    description: 'Choose the right mixing method and development target for pizza, bread, sourdough, and enriched doughs.',
    type: 'guide',
    category: 'dough',
    tags: ['bread', 'pizza', 'sourdough'],
    image: 'hand-mixing-dough.jpg',
    imageHash: '',
    created: '2026-08-25',
    searchText: 'developing dough mixing methodologies',
  },
  {
    slug: 'spiral-mixer-dough',
    title: 'Spiral Mixer Dough',
    order: 4,
    description: 'Mix bread, pizza, sourdough, and enriched doughs in a spiral mixer with temperature in mind.',
    type: 'technique',
    category: 'dough',
    tags: ['bread', 'pizza'],
    image: 'spiral-mixer-dough.jpg',
    imageHash: '',
    created: '2026-08-25',
    searchText: 'spiral mixer dough',
  },
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
