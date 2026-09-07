import { useId, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Switch } from './switch'

function SwitchExample({ initialChecked = false, disabled = false }: { initialChecked?: boolean; disabled?: boolean }) {
  const id = useId()
  const [checked, setChecked] = useState(initialChecked)
  return <div className="flex min-h-11 items-center gap-4"><label htmlFor={id} className="text-sm font-semibold text-ink">Cook Mode</label><Switch id={id} checked={checked} onCheckedChange={setChecked} disabled={disabled} /></div>
}

const meta = {
  title: 'Controls/Switch', component: SwitchExample, subcomponents: { Switch },
  parameters: { docs: { description: { component: 'Dedicated Radix switch with an external label, visible thumb, 44px hit area, and focus on the track. The label and surrounding row never gain a hover or selected fill.' } } },
} satisfies Meta<typeof SwitchExample>
export default meta
type Story = StoryObj<typeof meta>
export const Off: Story = {}
export const On: Story = { args: { initialChecked: true } }
export const Disabled: Story = { args: { disabled: true } }
export const OnYellow: Story = { decorators: [(Story) => <div className="bg-brand p-6"><Story /></div>] }
export const Keyboard: Story = { play: async ({ canvasElement }) => {
  const control = within(canvasElement).getByRole('switch', { name: 'Cook Mode' })
  control.focus()
  await userEvent.keyboard(' ')
  await expect(control).toHaveAttribute('aria-checked', 'true')
  await userEvent.keyboard(' ')
  await expect(control).toHaveAttribute('aria-checked', 'false')
} }
