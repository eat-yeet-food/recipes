import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ChoiceGroup } from './choice-group'
function Example({ long = false }: { long?: boolean }) {
  const [value, setValue] = useState('weights')
  return <div className="max-w-sm rounded-surface bg-brand p-6"><ChoiceGroup label="Calculator input mode" value={value} onChange={setValue} options={[{ value: 'weights', label: 'Weights' }, { value: 'target', label: long ? 'Target batch for a weekend bake' : 'Target batch' }]} /><p className="mt-4 text-ink" role="status">{value === 'weights' ? 'Ingredient weights' : 'Target batch size'}</p></div>
}
const meta = { title: 'Controls/Choice Group', component: Example, subcomponents: { ChoiceGroup }, parameters: { layout: 'padded', docs: { description: { component: 'Exclusive pressed buttons in a dark group. Outer radius minus the shared inset equals inner radius, including wrapped labels. Native Tab / Enter / Space. Selection and focus remain distinct; no label underlines.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Weights: Story = {}
export const LongLabels: Story = { args: { long: true } }
export const KeyboardSelection: Story = { play: async ({ canvasElement }) => { const canvas = within(canvasElement); const target = canvas.getByRole('button', { name: 'Target batch' }); target.focus(); await userEvent.keyboard(' '); await expect(target).toHaveAttribute('aria-pressed', 'true'); await expect(canvas.getByRole('status')).toHaveTextContent('Target batch size') } }
