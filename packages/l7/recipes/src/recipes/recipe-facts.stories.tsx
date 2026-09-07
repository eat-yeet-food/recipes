import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecipeFacts } from './recipe-facts'
const meta = {
  title: 'Recipes/Recipe Facts', component: RecipeFacts,
  args: { items: [['Prep time', '30 min'], ['Cook time', '15 min'], ['Total time', '8 hr 45 min'], ['Yield', '4 servings']] },
  parameters: { docs: { description: { component: 'Passive facts share one sunshine surface. Values lead; labels explain. These are not buttons, and do not have hover or selected states.' } } },
} satisfies Meta<typeof RecipeFacts>
export default meta
export const Default: StoryObj<typeof meta> = {}
export const LongValues: StoryObj<typeof meta> = { args: { items: [['Total time', '3 days 4 hr 36 min'], ['Yield', '3 16-inch pizzas']] } }
