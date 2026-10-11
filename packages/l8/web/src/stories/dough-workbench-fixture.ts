import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

/** Sourdough recipe and authored selection shared by the workbench stories. */
export const recipe = {
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

export const state = {
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
