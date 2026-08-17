import type { Meta, StoryObj } from '@storybook/react-vite'

import { BrowseCard, RecipeCard, RecipeGrid, SectionHeading } from '../components/layout'
import { ButternutRecipeTrial } from '../components/recipe-butternut-trial'
import { Icon } from '../components/icons'
import { CATEGORIES, type Category } from '../lib/categories'
import type { SearchParams } from '../lib/model'
import { INDEX, loadRecipe } from '../lib/recipes'

const pizzaRecipe = await loadRecipe('artisan-new-york-pizza')
if (!pizzaRecipe) throw new Error('Missing artisan-new-york-pizza fixture for Storybook')
const featuredCategories = CATEGORIES.filter((category) => category.featured && category.image).slice(0, 3)
const featuredRecipes = INDEX.slice(0, 6)
const categorySearch = (category: Category): SearchParams => ({ [category.facet]: category.value })

const swatches = [
  { name: 'Charcoal', value: '#373e40', token: 'text + chrome' },
  { name: 'Blush', value: '#f5dadd', token: 'recipe actions' },
  { name: 'Sage', value: '#607464', token: 'eyebrows + filters' },
  { name: 'Gold', value: '#d89b2b', token: 'warm accents' },
  { name: 'Peach', value: '#f7b49b', token: 'image fallback' },
  { name: 'Paper', value: '#fffaf7', token: 'soft surfaces' },
]

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

function StoryCanvas({ children }: { children: React.ReactNode }) {
  return <div data-storybook="">{children}</div>
}

function TypographyScale() {
  return (
    <div data-storybook-type-scale="">
      <div>
        <p data-storybook-label="">Display</p>
        <h3>Artisan New York Pizza</h3>
      </div>
      <div>
        <p data-storybook-label="">Body</p>
        <p>
          A high-hydration New York-style pizza dough mixed cold, fermented for
          2-3 days, and baked hot with tomato sauce and frozen cheese.
        </p>
      </div>
      <div>
        <p data-storybook-label="">Metadata</p>
        <p data-storybook-meta="">By Patrick Hogan • Mains • 3 pizzas</p>
      </div>
    </div>
  )
}

function ColorTokenGrid() {
  return (
    <div data-storybook-swatches="">
      {swatches.map((swatch) => (
        <div key={swatch.name} data-storybook-swatch="">
          <span style={{ backgroundColor: swatch.value }} />
          <strong>{swatch.name}</strong>
          <code>{swatch.value}</code>
          <small>{swatch.token}</small>
        </div>
      ))}
    </div>
  )
}

function RecipeActions() {
  return (
    <>
      <div data-storybook-buttons="" className="bb-trial-actions">
        <button type="button">
          <Icon name="share" className="size-4" />
          Pin Recipe
        </button>
        <button type="button">
          <Icon name="printer" className="size-4" />
          Print Recipe
        </button>
        <button type="button" aria-pressed="true">
          <Icon name="book" className="size-4" />
          Cook Mode
        </button>
        <a href="#trial-recipe-card">Jump to Recipe</a>
      </div>
      <p data-storybook-link-sample="">
        Ingredient links stay bold and black, like{' '}
        <a href="/recipes/artisan-new-york-pizza">this linked pantry item</a>.
      </p>
    </>
  )
}

function FormStates() {
  return (
    <div data-storybook-form-row="">
      <label>
        <span>Search</span>
        <input type="search" value="pizza" readOnly />
      </label>
      <label>
        <span>Course</span>
        <select defaultValue="mains">
          <option value="mains">Mains</option>
          <option value="desserts">Desserts</option>
        </select>
      </label>
      <div data-storybook-chip-row="">
        <button type="button" aria-pressed="true">
          Mains
        </button>
        <button type="button" aria-pressed="false">
          Vegetarian
        </button>
        <button type="button" disabled>
          Unavailable
        </button>
      </div>
    </div>
  )
}

function Cards() {
  return (
    <div data-storybook-card-row="">
      {featuredRecipes.slice(0, 3).map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} />
      ))}
    </div>
  )
}

function BrowseGallery() {
  return (
    <div data-storybook-card-row="">
      {featuredCategories.map((category) => (
        <BrowseCard
          key={category.slug}
          label={category.label}
          imageUrl={category.image ?? ''}
          search={categorySearch(category)}
        />
      ))}
    </div>
  )
}

const meta = {
  title: 'Design System/Eat Yeet',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {
  render: () => (
    <StoryCanvas>
      <header data-storybook-header="">
        <p data-storybook-eyebrow="">Eat / Yeet Storybook</p>
        <h1>Design System</h1>
        <p>
          Production components, recipe data, type, colors, buttons, links,
          forms, cards, grids, and recipe page patterns rendered in Storybook.
        </p>
      </header>

      <StorySection eyebrow="Design System" title="Typography Scale">
        <TypographyScale />
      </StorySection>
      <StorySection eyebrow="Design System" title="Color Tokens">
        <ColorTokenGrid />
      </StorySection>
      <StorySection eyebrow="Design System" title="Buttons and Links">
        <RecipeActions />
      </StorySection>
      <StorySection eyebrow="Design System" title="Forms and Filter States">
        <FormStates />
      </StorySection>
      <StorySection eyebrow="Typography" title="Section Heading">
        <div data-storybook-surface="">
          <SectionHeading eyebrow="Top Eats" title="Latest Recipes" />
        </div>
      </StorySection>
      <StorySection eyebrow="Cards" title="Recipe Cards">
        <Cards />
      </StorySection>
      <StorySection eyebrow="Cards" title="Browse Gallery">
        <BrowseGallery />
      </StorySection>
      <StorySection eyebrow="Grid" title="Empty and Filled Recipe Grids">
        <div data-storybook-stack="">
          <RecipeGrid recipes={[]} />
          <RecipeGrid recipes={featuredRecipes} />
        </div>
      </StorySection>
      <StorySection eyebrow="Recipe" title="Canonical Recipe Article">
        <div data-storybook-recipe-frame="">
          <ButternutRecipeTrial recipe={pizzaRecipe} showOriginalLink={false} />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const Typography: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Typography Scale">
        <TypographyScale />
      </StorySection>
    </StoryCanvas>
  ),
}

export const ColorTokens: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Color Tokens">
        <ColorTokenGrid />
      </StorySection>
    </StoryCanvas>
  ),
}

export const ButtonsAndLinks: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Buttons and Links">
        <RecipeActions />
      </StorySection>
    </StoryCanvas>
  ),
}

export const FormsAndFilterStates: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Forms and Filter States">
        <FormStates />
      </StorySection>
    </StoryCanvas>
  ),
}

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
        <Cards />
      </StorySection>
    </StoryCanvas>
  ),
}

export const BrowseCards: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Cards" title="Browse Gallery">
        <BrowseGallery />
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
          <RecipeGrid recipes={featuredRecipes} />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const RecipeArticle: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Recipe" title="Canonical Recipe Article">
        <div data-storybook-recipe-frame="">
          <ButternutRecipeTrial recipe={pizzaRecipe} showOriginalLink={false} />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}
