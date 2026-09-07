import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CookModeSwitch, RecipeAction } from './recipe-actions'
import { RecipeArticleHeader } from './recipe-article'

const HEADER_WIDTHS = { full: '', phone: 'max-w-[350px]', tablet: 'max-w-[480px]' } as const

function ActionsExample({ width = 'full', title = 'New York Style Pizza' }: { width?: keyof typeof HEADER_WIDTHS; title?: string }) {
  const [checked, setChecked] = useState(false)
  return <div className={`yeet bg-white p-4 ${HEADER_WIDTHS[width]}`}><RecipeArticleHeader
    page={{ title, description: 'A high-hydration pizza dough with a long, cold fermentation.' }}
    pinUrl={new URL('https://www.pinterest.com/pin/create/button/')}
    printPage={() => {}}
    focusedCooking={checked}
    toggleFocusedCooking={() => setChecked((value) => !value)}
  /></div>

}

const meta = { title: 'Recipes/Actions', component: ActionsExample, subcomponents: { RecipeArticleHeader, RecipeAction, CookModeSwitch }, parameters: { docs: { description: { component: 'The production header gives narrow titles the full row, with the byline and Cooking view beneath. At a header width of 52rem, the switch moves beside the title. Compact, thin ink-bordered Pin and Print actions retain their icons and never stretch across the mobile row. Print, Pin, and Cooking view appear once in the main header; the recipe body does not repeat them. Switch labels sit 12px from their tracks without surrounding button fill.' } } } } satisfies Meta<typeof ActionsExample>
export default meta
export const Header: StoryObj<typeof meta> = {}
export const PhoneHeader: StoryObj<typeof meta> = { args: { width: 'phone' } }
export const TabletHeader: StoryObj<typeof meta> = { args: { width: 'tablet' } }
export const LongTitle: StoryObj<typeof meta> = { args: { width: 'tablet', title: 'Slow-Fermented New York Style Pizza with Roasted Garlic' } }
