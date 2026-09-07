import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { recipeWorkbenchRegistry } from '@app/recipe-workbenches'

const plugin = recipeWorkbenchRegistry.get('sourdough')!

const recipe = {
  slug: 'storybook-sourdough',
  title: 'Country Sourdough',
  description: 'A configurable naturally leavened loaf.',
  category: 'savory',
  defaultMethod: 'dutch-oven',
  methodOptions: [{ id: 'dutch-oven', label: 'Dutch Oven', description: '', prepMinutes: 60, cookMinutes: 40, totalMinutes: 1800, yieldAmount: 2, yieldUnit: 'loaves', blocks: [] }],
  blocks: [],
  courses: [], cuisines: [], methods: [], restrictions: [], occasions: [], ingredientTypes: [],
  order: null, prepMinutes: 60, cookMinutes: 40, totalMinutes: 1800,
  yieldAmount: 2, yieldUnit: 'loaves', image: '', imageHash: '', created: '', searchText: '',
} as RecipeContent

const state = {
  version: 1,
  methodId: 'dutch-oven',
  batch: { count: 2, pieceWeightGrams: 907.5, pieceLabel: 'loaf' },
  formula: {
    family: 'sourdough', hydrationPercent: 77.04, saltPercent: 1.97,
    oilPercent: 0, sugarPercent: 0, maltPercent: 0, yeastPercent: 0, levainPercent: 17.26,
    flour: [
      { id: 'bread', name: 'High-protein organic stone-milled bread flour', percent: 70 },
      { id: 'whole-wheat', name: 'Whole wheat flour', percent: 20 },
      { id: 'rye', name: 'Dark rye flour', percent: 10 },
    ],
    starter: {
      hydrationPercent: 77,
      flour: [
        { id: 'bread', name: 'Bread flour', percent: 50 },
        { id: 'whole-wheat', name: 'Whole wheat flour', percent: 25 },
        { id: 'rye', name: 'Dark rye flour', percent: 25 },
      ],
    },
  },
} as const

function WorkbenchPreview({ invalid = false }: { invalid?: boolean }) {
  const selected = invalid
    ? { ...state, formula: { ...state.formula, flour: state.formula.flour.map((part, index) => index === 0 ? { ...part, percent: 60 } : part) } }
    : state
  const config = { defaultInputMode: 'weights', defaultSelection: selected, recommendedFormulas: {}, doughIngredientSectionId: 'dough', initialWaterPercent: 97 }
  const Drawer = plugin.Drawer
  return <Drawer recipe={recipe} config={config} state={selected} onApply={() => {}} hasSharedConfiguration={false} storageScope="storybook" open onOpenChange={() => {}} />
}

const meta = {
  title: 'Recipes/Dough workbench',
  component: WorkbenchPreview,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WorkbenchPreview>

export default meta
type Story = StoryObj<typeof meta>

export const SourdoughWeights: Story = {}
export const IncompleteFlourBlend: Story = { args: { invalid: true } }
