import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ChefHat } from 'lucide-react'
import { Toggle } from './button'

const usage = `**When to use:** a standalone on/off control: search categories, the phone Filters button, Cooking view. Off is a 1.5px plum outline; on is the pink fill with a plum label (the one selected look, shared with Choice Group). Always exposes \`aria-pressed\`.

**When not to use:** exclusive choices inside a form (use **Choice Group**), settings that apply immediately and persist (use **Switch**), or actions (use **Button**).`

function ToggleExample({ initial = false, label = 'Savory', icon = false }: { initial?: boolean; label?: string; icon?: boolean }) {
  const [pressed, setPressed] = useState(initial)
  return <Toggle pressed={pressed} onClick={() => setPressed(!pressed)}>{icon && <ChefHat className="size-3.5" />}{label}</Toggle>
}
const meta = { title: 'Primitives/Toggle', component: ToggleExample, subcomponents: { Toggle }, parameters: { layout: 'padded', docs: { description: { component: usage } } } } satisfies Meta<typeof ToggleExample>
export default meta
type Story = StoryObj<typeof meta>
export const Off: Story = {}
export const On: Story = { args: { initial: true } }
export const WithIcon: Story = { args: { label: 'Cooking view', icon: true } }
export const Group: Story = { render: () => <div role="group" aria-label="Category filter" className="flex flex-wrap gap-2"><ToggleExample label="All" initial /><ToggleExample label="Savory" /><ToggleExample label="Sweet" /></div> }
export const Keyboard: Story = { play: async ({ canvasElement }) => {
  const toggle = within(canvasElement).getByRole('button', { name: 'Savory' })
  toggle.focus(); await userEvent.keyboard(' ')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
} }
