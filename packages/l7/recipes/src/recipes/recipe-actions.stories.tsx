import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecipeAction } from './recipe-actions'
import { RecipeArticleHeader } from './recipe-article'

const HEADER_WIDTHS = { full: '', phone: 'max-w-[350px]', tablet: 'max-w-[480px]' } as const

function ActionsExample({ width = 'full', title = 'New York Style Pizza' }: { width?: keyof typeof HEADER_WIDTHS; title?: string }) {
  const [checked, setChecked] = useState(false)
  return <div className={`yeet bg-ink p-4 ${HEADER_WIDTHS[width]}`}><RecipeArticleHeader
    page={{ title, description: 'A high-hydration pizza dough with a long, cold fermentation.', prepMinutes: 4560, cookMinutes: 6, totalMinutes: 4566, yieldAmount: 1, yieldUnit: '16-inch pizza' } as never}
    printPage={() => {}}
    focusedCooking={checked}
    toggleFocusedCooking={() => setChecked((value) => !value)}
  /></div>

}

const meta = { title: 'Features/Recipes/Actions', component: ActionsExample, subcomponents: { RecipeArticleHeader, RecipeAction }, parameters: { docs: { description: { component: 'The recipe header sits on a plum band: white title, pink byline and breadcrumbs, pale description and the recipe facts. Print and Cooking view are translucent white circles; Cooking view turns pink with a plum icon (aria-pressed) when on.' } } } } satisfies Meta<typeof ActionsExample>
export default meta
export const Header: StoryObj<typeof meta> = {}
export const PhoneHeader: StoryObj<typeof meta> = { args: { width: 'phone' } }
export const TabletHeader: StoryObj<typeof meta> = { args: { width: 'tablet' } }
export const LongTitle: StoryObj<typeof meta> = { args: { width: 'tablet', title: 'Slow-Fermented New York Style Pizza with Roasted Garlic' } }
