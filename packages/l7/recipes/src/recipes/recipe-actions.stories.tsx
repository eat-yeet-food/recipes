import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Printer, Share2 } from 'lucide-react'
import { CookModeSwitch, RecipeAction } from './recipe-actions'
import { RecipeArticleHeader } from './recipe-article'

const HEADER_WIDTHS = { full: '', phone: 'max-w-[350px]', tablet: 'max-w-[480px]' } as const

function ActionsExample({ placement = 'hero', width = 'full', title = 'New York Style Pizza' }: { placement?: 'hero' | 'card'; width?: keyof typeof HEADER_WIDTHS; title?: string }) {
  const [checked, setChecked] = useState(false)
  if (placement === 'hero') return <div className={`yeet bg-white p-4 ${HEADER_WIDTHS[width]}`}><RecipeArticleHeader
    page={{ title, description: 'A high-hydration pizza dough with a long, cold fermentation.' }}
    pinUrl={new URL('https://www.pinterest.com/pin/create/button/')}
    printPage={() => {}}
    focusedCooking={checked}
    toggleFocusedCooking={() => setChecked((value) => !value)}
  /></div>
  return <div className="flex flex-wrap items-center gap-3 bg-white p-4">
    <RecipeAction variant={placement} onClick={() => {}}><Share2 className="size-4" />Pin Recipe</RecipeAction>
    <RecipeAction variant={placement} onClick={() => {}}><Printer className="size-4" />Print Recipe</RecipeAction>
    <CookModeSwitch checked={checked} onCheckedChange={() => setChecked((value) => !value)} />
  </div>
}

const meta = { title: 'Recipes/Actions', component: ActionsExample, subcomponents: { RecipeArticleHeader, RecipeAction, CookModeSwitch }, parameters: { docs: { description: { component: 'The production header gives narrow titles the full row, with the byline and Cooking view beneath. At a header width of 52rem, the switch moves beside the title. Compact, thin ink-bordered Pin and Print actions retain their icons and never stretch across the mobile row. The recipe-card row retains filled ink actions with cream labels. Switch labels sit 12px from their tracks in the header and 8px beside the recipe, without surrounding button fill.' } } } } satisfies Meta<typeof ActionsExample>
export default meta
export const Header: StoryObj<typeof meta> = {}
export const PhoneHeader: StoryObj<typeof meta> = { args: { width: 'phone' } }
export const TabletHeader: StoryObj<typeof meta> = { args: { width: 'tablet' } }
export const LongTitle: StoryObj<typeof meta> = { args: { width: 'tablet', title: 'Slow-Fermented New York Style Pizza with Roasted Garlic' } }
export const RecipeCard: StoryObj<typeof meta> = { args: { placement: 'card' } }
