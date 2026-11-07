import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'
function Example({ size = 'default', disabled = false, initial = false }: { size?: 'default' | 'compact'; disabled?: boolean; initial?: boolean }) {
  const [checked, setChecked] = useState(initial)
  return <label className="flex min-h-11 items-center gap-3 text-sm text-ink"><Checkbox size={size} disabled={disabled} checked={checked} onCheckedChange={(v) => setChecked(v === true)} />Mains</label>
}
const meta = { title: 'Primitives/Checkbox', component: Example, subcomponents: { Checkbox }, parameters: { layout: 'padded', docs: { description: { component: 'Radix checkbox: a 1px `input` edge, plum fill with a light check when checked. `compact` is for dense filter rows; the whole label row stays clickable.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Unchecked: Story = {}
export const Checked: Story = { args: { initial: true } }
export const Compact: Story = { args: { size: 'compact', initial: true } }
export const Disabled: Story = { args: { disabled: true } }
