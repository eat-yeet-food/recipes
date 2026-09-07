import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Printer, Share2 } from 'lucide-react'
import { CookModeSwitch, RecipeAction } from './recipe-actions'

function ActionsExample({ placement = 'hero' }: { placement?: 'hero' | 'card' }) {
  const [checked, setChecked] = useState(false)
  return <div className="flex flex-wrap items-center gap-3 bg-white p-4">
    <RecipeAction variant={placement} onClick={() => {}}><Share2 className="size-4" />Pin Recipe</RecipeAction>
    <RecipeAction variant={placement} onClick={() => {}}><Printer className="size-4" />Print Recipe</RecipeAction>
    <CookModeSwitch label={placement === 'hero' ? 'Cooking view' : 'Cook Mode'} checked={checked} onCheckedChange={() => setChecked((value) => !value)} />
  </div>
}

const meta = { title: 'Recipes/Actions', component: ActionsExample, subcomponents: { RecipeAction, CookModeSwitch }, parameters: { docs: { description: { component: 'The article header uses quiet ink utility actions. The recipe-card row retains filled ink actions with cream labels. Cooking controls are labeled switches without a surrounding button fill.' } } } } satisfies Meta<typeof ActionsExample>
export default meta
export const Header: StoryObj<typeof meta> = {}
export const RecipeCard: StoryObj<typeof meta> = { args: { placement: 'card' } }
