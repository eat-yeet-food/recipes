import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Printer, Share2 } from 'lucide-react'
import { CookModeSwitch, RecipeAction } from './recipe-actions'
import { RecipeArticleHeader } from './recipe-article'

function ActionsExample({ placement = 'hero' }: { placement?: 'hero' | 'card' }) {
  const [checked, setChecked] = useState(false)
  if (placement === 'hero') return <div className="yeet bg-white p-4"><RecipeArticleHeader
    page={{ title: 'New York Style Pizza', description: 'A high-hydration pizza dough with a long, cold fermentation.' }}
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

const meta = { title: 'Recipes/Actions', component: ActionsExample, subcomponents: { RecipeArticleHeader, RecipeAction, CookModeSwitch }, parameters: { docs: { description: { component: 'The production article header places Cooking view at the right of the title row and uses compact, thin ink-bordered utility actions below. Narrow layouts let the switch wrap right without squeezing the title. The recipe-card row retains filled ink actions with cream labels. Switch labels sit 12px from their tracks in the header and 8px beside the recipe, without surrounding button fill.' } } } } satisfies Meta<typeof ActionsExample>
export default meta
export const Header: StoryObj<typeof meta> = {}
export const RecipeCard: StoryObj<typeof meta> = { args: { placement: 'card' } }
