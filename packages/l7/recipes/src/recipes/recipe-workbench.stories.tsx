import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RecipeAdjustmentSummary } from './recipe-workbench'

const meta = {
  title: 'Recipes/Adjustment summary',
  component: RecipeAdjustmentSummary,
  args: {
    summary: { heading: '3 × 16-inch pizzas', details: '480g each · Outdoor Oven · 65% hydration' },
    onOpen: fn(),
  },
  decorators: [(Story) => <div className="max-w-[var(--layout-recipe-copy)] bg-white p-4 text-ink"><Story /></div>],
  parameters: { docs: { description: { component: 'Shared pizza and sourdough adjustment toolbar. The unfilled recipe summary separates yield from configuration details; an ink pill opens the recipe’s workbench dialog. The button stacks below the summary at narrow widths and is hidden in print.' } } },
} satisfies Meta<typeof RecipeAdjustmentSummary>

export default meta
type Story = StoryObj<typeof meta>
export const Pizza: Story = {}
export const Sourdough: Story = { args: { summary: { heading: '2 loaves', details: '900g each · Dutch Oven · 78% hydration · Hand mixed' } } }
export const CustomPizzaWeight: Story = { args: { summary: { heading: '1 ball', details: '350g each · Home Oven · 65% hydration' } } }
export const LongSummary: Story = { args: { summary: { heading: '12 loaves', details: '1200g each · Covered Dutch Oven · 82.5% hydration · Spiral mixer' } } }
