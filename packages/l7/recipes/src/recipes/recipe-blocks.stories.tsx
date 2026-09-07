import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecipeList } from './recipe-blocks'

const meta = {
  title: 'Recipes/Sections', component: RecipeList,
  args: { sections: [{ id: 'dough', title: 'Dough', items: ['846g All-purpose flour', '575g water'], itemIds: ['flour', 'water'] }] },
  parameters: { docs: { description: { component: 'Production ingredient and instruction groups use bold uppercase subsection headings. Lists sit directly on the reading surface without an extra padded card.' } } },
} satisfies Meta<typeof RecipeList>
export default meta
export const Ingredients: StoryObj<typeof meta> = {}
export const Instructions: StoryObj<typeof meta> = { args: { ordered: true, sections: [{ id: 'mixing', title: 'Mix the dough', items: ['Combine the flour and water.', 'Mix until no dry flour remains.'], itemIds: ['combine', 'mix'] }] } }
