import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { pageBlockRegistry } from '@app/page-blocks'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { AccountProvider } from '@eat-yeet/l6-ui-shell/account/account'
import { fixtureMember, memoryAccountClient } from '@eat-yeet/l6-ui-shell/account/account-fixture'
import { KitchenBakeSheet } from '@eat-yeet/l7-kitchen/kitchen/kitchen-bake'
import { memoryKitchenClient } from '@eat-yeet/l7-kitchen/kitchen/kitchen-fixture'
import { KitchenFormulaPage } from '@eat-yeet/l7-kitchen/kitchen/kitchen-formula'
import { KitchenLibraryPage } from '@eat-yeet/l7-kitchen/kitchen/kitchen-library'
import { kitchenRecipe, type KitchenRecipe } from '@eat-yeet/l7-kitchen/kitchen/kitchen-plugin'
import { KitchenScratchPage } from '@eat-yeet/l7-kitchen/kitchen/kitchen-scratch'

const pizzaState = {
  version: 1, methodId: 'outdoor-oven',
  batch: { count: 3, pieceWeightGrams: 480, diameterInches: 16, pieceLabel: 'ball' },
  formula: { family: 'pizza', hydrationPercent: 65, saltPercent: 2, oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0.25, levainPercent: 0,
    flour: [{ id: 'all-purpose', name: 'Kirkland Organic All-Purpose Flour', percent: 100 }] },
}
const sourdoughState = {
  version: 1, methodId: 'dutch-oven',
  batch: { count: 2, pieceWeightGrams: 907.5, pieceLabel: 'loaf' },
  formula: { family: 'sourdough', hydrationPercent: 77.04, saltPercent: 1.97, oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0, levainPercent: 17.26,
    flour: [{ id: 'bread', name: 'Bread flour', percent: 80.33 }, { id: 'whole-wheat', name: 'Whole wheat flour', percent: 19.67 }],
    starter: { hydrationPercent: 77, flour: [{ id: 'bread', name: 'Bread flour', percent: 50 }, { id: 'whole-wheat', name: 'Whole wheat flour', percent: 50 }] },
    process: { mixingMethod: 'spiral', foldMethod: 'coil-fold', autolyseMinutes: 180, saltDelayMinutes: 30, bulkMinutes: 290, folds: [{ id: 'fold-1', atMinutes: 60, method: 'stretch-and-fold' }, { id: 'fold-2', atMinutes: 120 }] } },
}
const method = (id: string, label: string) => ({ id, label, description: '', prepMinutes: 60, cookMinutes: 6, totalMinutes: 4596, yieldAmount: 3, yieldUnit: '16-inch pizzas', blocks: [] })
const base = { category: 'savory', blocks: [], courses: [], cuisines: [], methods: [], restrictions: [], occasions: [], ingredientTypes: [], order: null, prepMinutes: 60, cookMinutes: 6, totalMinutes: 4596, image: '', imageHash: '', created: '', searchText: '' }
const doughBlock = (dough: string[], steps: string[]) => ({ type: 'recipe', id: 'recipe', ingredients: [{ id: 'dough', title: 'Dough', items: dough, itemIds: dough.map((_, index) => `dough-${index}`) }],
  steps: [{ id: 'dough-steps', title: 'Dough', items: steps, itemIds: steps.map((_, index) => `step-${index}`) }], equipment: [], notes: [], tips: [] })

const pizza = {
  ...base, slug: 'storybook-pizza', title: 'New York Style Pizza', description: 'A crisp, foldable New York-style pizza.', defaultMethod: 'outdoor-oven',
  methodOptions: [method('outdoor-oven', 'Outdoor Oven'), method('indoor-steel', 'Indoor Steel')], yieldAmount: 3, yieldUnit: '16-inch pizzas',
  blocks: [doughBlock(['Authored dough'], ['Add the {{mixingIngredients}} to the mixer.', 'Divide into {{pieceCount}} {{pieceLabelPlural}} of {{pieceWeightGrams}} each.'])],
  workbench: { id: 'pizza', config: { defaultInputMode: 'target', doughIngredientSectionId: 'dough', pizzaSizing: { referenceDiameterInches: 16, referenceBallWeightGrams: 480, diametersInches: [10, 12, 14, 16] }, defaultSelection: pizzaState, recommendedFormulas: {} } },
} as unknown as RecipeContent
const sourdough = {
  ...base, slug: 'storybook-sourdough', title: 'Sourdough Bread', description: 'Crackling, deeply browned loaves.', defaultMethod: 'dutch-oven',
  methodOptions: [method('dutch-oven', 'Dutch Oven')], yieldAmount: 2, yieldUnit: 'loaves',
  workbench: { id: 'sourdough', config: { defaultInputMode: 'target', doughIngredientSectionId: 'dough', defaultSelection: sourdoughState, recommendedFormulas: {} } },
} as unknown as RecipeContent
const kitchens = [kitchenRecipe(pizza, recipeWorkbenchRegistry)!, kitchenRecipe(sourdough, recipeWorkbenchRegistry)!]
const friday = { ...pizzaState, batch: { count: 4, pieceWeightGrams: 368, diameterInches: 14, pieceLabel: 'ball' }, formula: { ...pizzaState.formula, hydrationPercent: 68, saltPercent: 2.2, yeastPercent: 0.2 } }
const seeds = [
  { name: 'Friday pies', recipeSlug: 'storybook-pizza', family: 'pizza', state: friday, notes: 'Cold ferment 72 hours.', history: [{ state: pizzaState, minutesAgo: 60 * 24 * 20 }, { state: { ...friday, formula: { ...friday.formula, hydrationPercent: 66 } }, minutesAgo: 60 * 24 * 7 }, { state: friday, minutesAgo: 60 * 24 * 2 }] },
  { name: 'Open crumb 80%', recipeSlug: 'storybook-sourdough', family: 'sourdough', state: { ...sourdoughState, formula: { ...sourdoughState.formula, hydrationPercent: 80 } } },
  { name: 'Kids’ 10-inch', recipeSlug: 'storybook-pizza', family: 'pizza', state: { ...pizzaState, batch: { count: 6, pieceWeightGrams: 188, diameterInches: 10, pieceLabel: 'ball' } }, deleted: true },
]

function Account({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const [client] = useState(() => memoryAccountClient({ member: signedIn ? fixtureMember : null }))
  return <AccountProvider client={client} initialSession={{ member: signedIn ? fixtureMember : null, providers: { google: true } }}>{children}</AccountProvider>
}

function Page({ view, signedIn = true }: { view: 'library' | 'scratch' | 'formula' | 'sourdough' | 'bake'; signedIn?: boolean }) {
  const [client] = useState(() => memoryKitchenClient({ formulas: seeds }))
  const [firstId, setFirstId] = useState<string | null>(null)
  useEffect(() => {
    if (view === 'formula') void client.list().then(({ formulas }) => setFirstId(formulas.find((formula) => formula.name === 'Friday pies')!.id))
  }, [view, client])
  const kitchen: KitchenRecipe = view === 'sourdough' ? kitchens[1] : kitchens[0]
  return <Account signedIn={signedIn}>
    {view === 'library' && <KitchenLibraryPage recipes={kitchens} client={client} />}
    {(view === 'scratch' || view === 'sourdough') && <KitchenScratchPage kitchen={kitchen} client={client} />}
    {view === 'formula' && firstId && <KitchenFormulaPage kitchen={kitchen} formulaId={firstId} client={client} />}
    {view === 'bake' && <KitchenBakeSheet kitchen={kitchen} state={friday} name="Friday pies" siteUrl="https://eatyeet.com" blockRegistry={pageBlockRegistry}
      heading={{ crumbs: [{ label: 'Notebook', href: '/notebook' }, { label: 'Friday pies' }, { label: 'Bake sheet' }], title: 'Friday pies', byline: 'Bake sheet · New York Style Pizza', pin: false }} />}
  </Account>
}

const meta = {
  title: 'Kitchen/Pages',
  component: Page,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Notebook pages composed with the app’s dough calculator and in-memory account and kitchen transports. Recipes stay as written; each formula has its own page, saves automatically and keeps History.' } } },
} satisfies Meta<typeof Page>

export default meta
type Story = StoryObj<typeof meta>

export const LibrarySignedOut: Story = { args: { view: 'library', signedIn: false } }
export const Library: Story = {
  args: { view: 'library' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await expect(await screen.findByRole('link', { name: /Friday pies/ })).toBeVisible()
    await expect(screen.getByRole('heading', { level: 2, name: /^Sourdough/ })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /Recently deleted \(1\)/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await expect(await screen.findByText('Restored Kids’ 10-inch.')).toBeVisible()
  },
}
export const Calculator: Story = {
  args: { view: 'scratch', signedIn: false },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    const hydration = await screen.findByRole('textbox', { name: 'Hydration' })
    await userEvent.clear(hydration)
    await userEvent.type(hydration, '68')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Changed from the recipe' })).toHaveTextContent('now 68%'))
    await userEvent.click(screen.getByRole('button', { name: 'Reset to recipe' }))
    await expect(screen.getByRole('textbox', { name: 'Hydration' })).toHaveValue('65')
  },
}
export const SourdoughCalculator: Story = {
  args: { view: 'sourdough' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    const share = await screen.findByRole('textbox', { name: 'Bread flour percentage' })
    await userEvent.clear(share)
    await userEvent.type(share, '60')
    await expect(await screen.findByText(/must total 100%/)).toBeVisible()
    await expect(screen.getAllByRole('button', { name: 'Save to Notebook' })[0]).toBeDisabled()
  },
}
export const Formula: Story = {
  args: { view: 'formula' },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement)
    await screen.findByRole('heading', { level: 1, name: 'Friday pies' })
    await expect(screen.getByRole('region', { name: 'Changed from the recipe' })).toHaveTextContent('Batch')
    const yeast = screen.getByRole('textbox', { name: 'SAF red instant yeast' })
    await userEvent.clear(yeast)
    await userEvent.type(yeast, '0.15')
    await expect(await screen.findByText(/^Saved ·/, {}, { timeout: 3000 })).toBeVisible()
  },
}
export const BakeSheet: Story = { args: { view: 'bake' } }
