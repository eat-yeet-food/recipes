import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'
import { Select } from './select'
import { Textarea } from './textarea'
import { Checkbox } from './checkbox'
function Fields({ invalid = false, disabled = false, readOnly = false }: { invalid?: boolean; disabled?: boolean; readOnly?: boolean }) {
  const [checked, setChecked] = useState(false)
  return <div className="grid max-w-lg gap-6 rounded-surface bg-brand p-6">
    <label className="grid gap-2">Batch count<Input type="number" defaultValue={invalid ? 0 : 2} min={1} disabled={disabled} readOnly={readOnly} aria-invalid={invalid} aria-describedby={invalid ? 'field-error' : undefined} /></label>
    {invalid && <p id="field-error" role="alert" className="text-danger">Enter a batch count of at least one.</p>}
    <label className="grid gap-2">Oven method<Select disabled={disabled}><option>Dutch oven</option><option>Baking steel</option></Select></label>
    <label className="grid gap-2">Notes<Textarea placeholder="What worked well?" disabled={disabled} readOnly={readOnly} /></label>
    <label className="flex min-h-11 items-center gap-3"><Checkbox checked={checked} onCheckedChange={v => setChecked(v === true)} disabled={disabled} />Remember this formula</label>
  </div>
}
const meta = { title: 'Controls/Fields', component: Fields, subcomponents: { Input, Select, Textarea, Checkbox }, parameters: { layout: 'padded', docs: { description: { component: 'Native labeled fields with a flat ink fill, light text, and inset focus. No decorative bottom edge. Use aria-invalid and aria-describedby with actual error text. Disabled and read-only are different states. Do not remove native number/select keyboard behavior.' } } } } satisfies Meta<typeof Fields>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }
export const ReadOnly: Story = { args: { readOnly: true } }
export const SelectLongValue: Story = { render: () => <label className="grid max-w-xs gap-2">Oven method<Select><option>Indoor oven with a preheated baking steel</option><option>Outdoor oven</option></Select></label> }
export const OnInk: Story = { render: () => <div className="grid max-w-lg gap-4 rounded-field bg-ink p-6 text-action-label">
  <label className="grid gap-2">Formula name<Input surface="on-ink" placeholder="Weekend pizza" /></label>
  <label className="grid gap-2">Saved formula<Select surface="on-ink"><option>Weekend pizza</option><option>Weeknight pizza</option></Select></label>
</div> }
