import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'
import { Select } from './select'
import { Textarea } from './textarea'
import { Checkbox } from './checkbox'

const usage = `Two field surfaces, and only two:

- **Light (default):** white, a 1px \`input\` edge, plum text, muted placeholder, inset focus. Use inside dialogs, action cards (rating, reply) and the search palette.
- **Underline:** unboxed, plum value over one plum rule that thickens on focus. The standard for page forms (account settings, Notebook notes and values).

**Never** put a field on a solid pink or plum fill, and never use a dark field. Errors: \`aria-invalid\` plus a visible message linked with \`aria-describedby\`. Disabled and read-only are different states. Keep native number/select keyboard behavior.`

function Fields({ invalid = false, disabled = false, readOnly = false }: { invalid?: boolean; disabled?: boolean; readOnly?: boolean }) {
  const [checked, setChecked] = useState(false)
  return <div className="grid max-w-lg gap-6 bg-white p-6 text-ink">
    <label className="grid gap-2 text-sm font-medium">Batch count<Input type="number" defaultValue={invalid ? 0 : 2} min={1} disabled={disabled} readOnly={readOnly} aria-invalid={invalid} aria-describedby={invalid ? 'field-error' : undefined} /></label>
    {invalid && <p id="field-error" role="alert" className="text-sm text-danger">Enter a batch count of at least one.</p>}
    <label className="grid gap-2 text-sm font-medium">Oven method<Select disabled={disabled}><option>Dutch oven</option><option>Baking steel</option></Select></label>
    <label className="grid gap-2 text-sm font-medium">Notes<Textarea placeholder="What worked well?" disabled={disabled} readOnly={readOnly} /></label>
    <label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={checked} onCheckedChange={v => setChecked(v === true)} disabled={disabled} />Remember this formula</label>
  </div>
}
const meta = { title: 'Primitives/Fields', component: Fields, subcomponents: { Input, Select, Textarea, Checkbox }, parameters: { layout: 'padded', docs: { description: { component: usage } } } } satisfies Meta<typeof Fields>
export default meta
type Story = StoryObj<typeof meta>
export const Light: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }
export const ReadOnly: Story = { args: { readOnly: true } }
export const Underline: Story = { render: () => <div className="grid max-w-md gap-6 bg-white p-6 text-ink">
  <label className="grid text-sm font-medium">Public name<Input surface="underline" defaultValue="Jordan" /></label>
  <label className="grid text-sm font-medium">Email<Input surface="underline" type="email" placeholder="you@example.com" /></label>
  <label className="grid text-sm font-medium">Disabled<Input surface="underline" defaultValue="Read only here" disabled /></label>
</div> }
export const UnderlineInvalid: Story = { render: () => <div className="grid max-w-md gap-2 bg-white p-6 text-ink">
  <label className="grid text-sm font-medium">New password<Input surface="underline" type="password" defaultValue="short" aria-invalid aria-describedby="standard-error" /></label>
  <p id="standard-error" className="text-xs text-danger">Use at least 10 characters.</p>
</div> }
