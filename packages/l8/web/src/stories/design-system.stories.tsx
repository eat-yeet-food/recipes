import { useEffect, useRef, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { BrowseCard, RecipeCard, RecipeGrid, SectionHeading } from '@eat-yeet/l6-ui-catalog/cards'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import { PageBlocks, RecipeAction } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { ErrorState, NotFound } from '@eat-yeet/l6-ui-shell/shell/error-states'
import { Wordmark } from '@eat-yeet/l6-ui-shell/shell/wordmark'
import { Book, Printer, Share2 } from 'lucide-react'
import type { Category } from '@eat-yeet/l3-api-contract/categories'
import type { PageBlock, RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { SearchParams } from '@eat-yeet/l2-recipe-domain/search'
import { pageBlockRegistry } from '@app/page-blocks'
import { APP_CONFIG } from '@/lib/app-config'
import { recipeClient } from '@/lib/api'

const { recipe: loadedPizzaRecipe } = await recipeClient.getRecipe({ slug: 'artisan-new-york-pizza' })
if (!loadedPizzaRecipe) throw new Error('Missing artisan-new-york-pizza fixture for Storybook')
const pizzaRecipe: RecipeContent = loadedPizzaRecipe
const { recipes: allRecipes } = await recipeClient.listRecipes()
const APP_COPY = APP_CONFIG.copy
const SITE_URL = APP_CONFIG.siteUrl
const featuredCategories = APP_CONFIG.categories.filter((category) => category.featured && category.image).slice(0, 3)
const featuredRecipes = allRecipes.slice(0, 6)
const categorySearch = (category: Category): SearchParams => ({ [category.facet]: category.value })

/**
 * Swatches name a custom property, never a hex literal. The chip paints with
 * `var(--token)` and the caption reads the *resolved* value out of the live
 * cascade, so this story cannot drift from the app the way a hand-typed list
 * can.
 */
type Token = { name: string; token: string; usage: string }

/** Site chrome. `--color-*` come from the compiled Tailwind build's @theme block. */
const APP_TOKENS: Token[] = [
  { name: 'Brand', token: '--color-brand', usage: 'CTAs, links, "Yeet"' },
  { name: 'Brand Strong', token: '--color-brand-strong', usage: 'CTA hover' },
  { name: 'Ink', token: '--color-ink', usage: 'Tailwind body text, nav + footer chrome' },
  { name: 'Tint', token: '--color-tint', usage: 'home hero field' },
  { name: 'Highlight', token: '--color-highlight', usage: 'warm accent' },
  { name: 'Warm Deep', token: '--color-warm-deep', usage: 'secondary surface' },
  { name: 'Support Strong', token: '--color-support-strong', usage: 'eyebrows' },
]

/**
 * The block page's own palette, scoped to `.yeet` rather than `:root`,
 * so these chips have to render inside that class to resolve at all.
 */
const RECIPE_TOKENS: Token[] = [
  { name: 'Gray', token: '--yeet-gray', usage: 'recipe body ink' },
  { name: 'Tomato', token: '--yeet-tomato', usage: 'kickers + markers' },
  { name: 'Tomato Strong', token: '--yeet-tomato-strong', usage: 'small recipe metadata' },
  { name: 'Pink', token: '--yeet-pink', usage: 'link underline, card shadow' },
  { name: 'Light Pink', token: '--yeet-light-pink', usage: 'callouts + meta grid' },
  { name: 'Cream', token: '--yeet-cream', usage: 'warm surface' },
]

const SYSTEM_TOKENS: Token[] = [
  { name: 'Body Font', token: '--font-body', usage: 'body text' },
  { name: 'Display Font', token: '--font-display', usage: 'headings' },
  { name: 'Hero Font', token: '--font-hero', usage: 'hero lockup' },
  { name: 'Action Font', token: '--font-action', usage: 'recipe controls' },
  { name: 'Site Width', token: '--layout-site-max', usage: 'page max width' },
  { name: 'Page X', token: '--spacing-page-x', usage: 'default page gutters' },
  { name: 'Section Y', token: '--spacing-section-y', usage: 'vertical section rhythm' },
  { name: 'Mobile', token: '--breakpoint-mobile', usage: 'small layout switch' },
  { name: 'Desktop', token: '--breakpoint-desktop', usage: 'desktop layout switch' },
  { name: 'Nav Z', token: '--z-nav', usage: 'site chrome stack' },
  { name: 'Dialog Z', token: '--z-dialog', usage: 'modal stack' },
  { name: 'Fast Motion', token: '--transition-fast', usage: 'hover and focus' },
  { name: 'Nav Motion', token: '--transition-nav', usage: 'sticky chrome, motion' },
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

function Swatches({ tokens, scope }: { tokens: Token[]; scope?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [resolved, setResolved] = useState<Record<string, string>>({})

  // Read after paint, from the grid itself, so `scope`d properties resolve.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const style = getComputedStyle(el)
    setResolved(
      Object.fromEntries(tokens.map((t) => [t.token, style.getPropertyValue(t.token).trim()])),
    )
  }, [tokens])

  return (
    <div ref={ref} data-storybook-swatches="" className={scope}>
      {tokens.map((t) => (
        <div key={t.token} data-storybook-swatch="">
          <span style={{ backgroundColor: `var(${t.token})` }} />
          <strong>{t.name}</strong>
          <code>{resolved[t.token] || t.token}</code>
          <small>{t.usage}</small>
        </div>
      ))}
    </div>
  )
}

function ColorTokenGrid() {
  return (
    <div data-storybook-stack="">
      <Swatches tokens={APP_TOKENS} />
      <Swatches tokens={RECIPE_TOKENS} scope="yeet" />
    </div>
  )
}

function TokenTable({ tokens }: { tokens: Token[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [resolved, setResolved] = useState<Record<string, string>>({})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const style = getComputedStyle(el)
    setResolved(
      Object.fromEntries(tokens.map((t) => [t.token, style.getPropertyValue(t.token).trim()])),
    )
  }, [tokens])

  return (
    <div ref={ref} data-storybook-token-table="">
      {tokens.map((token) => (
        <div key={token.token}>
          <strong>{token.name}</strong>
          <code>{token.token}</code>
          <span>{resolved[token.token] || token.token}</span>
          <small>{token.usage}</small>
        </div>
      ))}
    </div>
  )
}

function RecipeActions() {
  return (
    // .yeet wrapper: the sample link below needs .yeet a's scoped article-link
    // styling; the controls themselves are real RecipeAction components.
    <div className="yeet">
      <div data-storybook-buttons="" className="yeet-actions flex flex-wrap gap-1">
        <RecipeAction variant="hero">
          <Share2 className="size-3" />
          Pin Recipe
        </RecipeAction>
        <RecipeAction variant="hero">
          <Printer className="size-3" />
          Print Recipe
        </RecipeAction>
        <RecipeAction variant="hero" pressed>
          <Book className="size-3" />
          Cook Mode
        </RecipeAction>
        <RecipeAction variant="hero" href="#recipe-card">
          Jump to Recipe
        </RecipeAction>
      </div>
      <p data-storybook-link-sample="">
        Ingredient links stay bold and black, like{' '}
        <a href="/recipes/artisan-new-york-pizza">this linked pantry item</a>.
      </p>
    </div>
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

const blockGalleryBlocks: PageBlock[] = [
  {
    type: 'markdown',
    html: '<h2>Standard Text</h2><p>Markdown blocks render headings, paragraphs, lists, and <strong>inline emphasis</strong> without shipping a browser markdown parser.</p><ul><li>First note</li><li>Second note</li></ul>',
  },
  {
    type: 'image',
    layout: { mode: 'grid', columns: 2 },
    images: [
      {
        src: '/images/hero-donuts.jpg',
        alt: 'Pink glazed donuts with colorful sprinkles',
        caption: 'Grid image block with a caption.',
      },
      {
        src: '/images/raised-donuts.jpg',
        alt: 'Raised donuts on a cooling rack',
        caption: 'Second image in the same block.',
      },
    ],
  },
  {
    type: 'recipe',
    equipment: [],
    ingredients: [{ title: 'Dough', items: ['500g bread flour', '350g water'] }],
    steps: [{ title: 'Mix', items: ['Combine ingredients until no dry flour remains.'] }],
    notes: ['Nested recipe markdown stays inline.'],
    tips: [],
  },
  { type: 'youtube', id: 'abc_123-xyz', title: 'Recipe video' },
]

function BlockGallery() {
  const pinUrl = new URL('https://www.pinterest.com/pin/create/button/')
  pinUrl.searchParams.set('url', `${SITE_URL}/recipes/${pizzaRecipe.slug}`)
  pinUrl.searchParams.set('description', pizzaRecipe.title)
  const firstRecipeBlockIndex = blockGalleryBlocks.findIndex((block) => block.type === 'recipe')

  return (
    <div className="yeet">
      <article className="yeet-card max-w-[760px] bg-white border-2 border-[var(--yeet-gray)] px-9 py-[34px] shadow-[18px_18px_0_var(--yeet-pink)]">
        <PageBlocks
          blocks={blockGalleryBlocks}
          registry={pageBlockRegistry}
          context={{
            page: { ...pizzaRecipe, blocks: blockGalleryBlocks },
            siteUrl: SITE_URL,
            cookMode: false,
            firstRecipeBlockIndex,
            printPage: () => {},
            pinUrl,
            onToggleCookMode: () => {},
          }}
        />
      </article>
    </div>
  )
}

/**
 * The three dead ends, together, because the point of them is that they look
 * like one thing. A visitor hitting any of these should not be able to tell
 * which subsystem failed.
 */
function DeadEndStates() {
  return (
    <div data-storybook-surface="">
      <NotFound />
      <ErrorState error={new Error('Something threw while rendering')} reset={() => {}} />
      <ErrorState
        error={new Error('Failed to fetch dynamically imported module: /build/index-abc123.js')}
      />
    </div>
  )
}

/**
 * One lockup, three scales. The nav, the home hero, and the footer all render
 * this component, so a change to any of them shows up in all three here.
 */
function BrandLockup() {
  return (
    <div data-storybook-surface="">
      <div data-storybook-stack="">
        <Wordmark copy={APP_COPY.wordmark} size="nav" />
        <Wordmark copy={APP_COPY.wordmark} size="footer" />
        <Wordmark copy={APP_COPY.wordmark} size="hero" />
      </div>
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

      <StorySection eyebrow="Brand" title="Wordmark">
        <BrandLockup />
      </StorySection>
      <StorySection eyebrow="Design System" title="Typography Scale">
        <TypographyScale />
      </StorySection>
      <StorySection eyebrow="Design System" title="Color Tokens">
        <ColorTokenGrid />
      </StorySection>
      <StorySection eyebrow="Design System" title="Theme Contract">
        <TokenTable tokens={SYSTEM_TOKENS} />
      </StorySection>
      <StorySection eyebrow="Design System" title="Buttons and Links">
        <RecipeActions />
      </StorySection>
      <StorySection eyebrow="Design System" title="Forms and Filter States">
        <FormStates />
      </StorySection>
      <StorySection eyebrow="States" title="Not Found and Error Boundaries">
        <DeadEndStates />
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
      <StorySection eyebrow="Content" title="Page Blocks">
        <BlockGallery />
      </StorySection>
      <StorySection eyebrow="Content" title="Canonical Block Page">
        <div data-storybook-recipe-frame="">
          <ContentPageArticle page={pizzaRecipe} siteUrl={SITE_URL} blockRegistry={pageBlockRegistry} />
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

export const ThemeContract: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Theme Contract">
        <TokenTable tokens={SYSTEM_TOKENS} />
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

export const PageBlockGallery: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Content" title="Page Blocks">
        <BlockGallery />
      </StorySection>
    </StoryCanvas>
  ),
}

export const DeadEnds: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="States" title="Not Found and Error Boundaries">
        <DeadEndStates />
      </StorySection>
    </StoryCanvas>
  ),
}

export const BlockPage: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Content" title="Canonical Block Page">
        <div data-storybook-recipe-frame="">
          <ContentPageArticle page={pizzaRecipe} siteUrl={SITE_URL} blockRegistry={pageBlockRegistry} />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const BrandWordmark: Story = {
  name: 'Wordmark',
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Brand" title="Wordmark">
        <BrandLockup />
      </StorySection>
    </StoryCanvas>
  ),
}
