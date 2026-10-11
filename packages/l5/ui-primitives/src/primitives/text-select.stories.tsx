import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { TextSelect } from './text-select'

const FORMULAS = [
  { value: 'original', label: 'Original' },
  { value: 'everyday', label: 'Everyday sourdough' },
  { value: 'long', label: 'Whole wheat sandwich loaf for the weekend bake sale' },
]

function Example({ narrow = false, disabled = false, custom = false }: { narrow?: boolean; disabled?: boolean; custom?: boolean }) {
  const [value, setValue] = useState(custom ? 'custom' : 'everyday')
  const options = value === 'custom' ? [...FORMULAS, { value: 'custom', label: 'Custom', disabled: true }] : FORMULAS
  return <div className={narrow ? 'max-w-[220px] bg-white p-6 text-ink' : 'bg-white p-6 text-ink'}>
    <div className="flex min-w-0 items-center gap-1.5 font-action text-[11px] font-bold uppercase tracking-[0.8px]">
      <span className="shrink-0">Your recipe</span><span aria-hidden="true">·</span>
      <TextSelect label="Saved formula" value={value} onChange={setValue} options={options} disabled={disabled} className="-my-1" />
    </div>
    <p className="mt-2 text-sm text-muted-foreground" role="status">{options.find(option => option.value === value)?.label}</p>
  </div>
}

const meta = { title: 'Controls/Text select', component: Example, subcomponents: { TextSelect }, parameters: { layout: 'padded', docs: { description: { component: 'A native select presented as a borderless text action: the chosen label is underlined beside a chevron and inherits the surrounding type. Use it for a compact inline choice inside a label row, such as the saved formula in the recipe summary. Hover thickens the underline; keyboard focus adds one outward outline. Long labels truncate inside the available width rather than resizing their row. The accessible name comes from `label`; native menu and keyboard behavior are unchanged.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const LongLabel: Story = { args: { narrow: true }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Saved formula' }), 'long')
  // The control is the select's wrapper; its row sits inside the narrow example.
  const control = canvas.getByRole('combobox', { name: 'Saved formula' }).parentElement!
  await expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(control.parentElement!.getBoundingClientRect().right)
} }
export const UnsavedChoice: Story = { args: { custom: true }, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await expect(canvas.getByRole('option', { name: 'Custom' })).toBeDisabled()
} }
export const Disabled: Story = { args: { disabled: true } }
export const KeyboardSelection: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  const select = canvas.getByRole('combobox', { name: 'Saved formula' })
  await userEvent.tab()
  await expect(select).toHaveFocus()
  await userEvent.selectOptions(select, 'original')
  await expect(canvas.getByRole('status')).toHaveTextContent('Original')
} }
