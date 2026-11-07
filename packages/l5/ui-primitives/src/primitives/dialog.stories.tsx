import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Input } from './input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'
function Example({ stripe = true, variant = 'dialog' }: { stripe?: boolean; variant?: 'dialog' | 'sheet' }) {
  return <Dialog open><DialogContent stripe={stripe} variant={variant} className="p-6 text-ink sm:max-w-md">
    <DialogTitle className="font-display text-2xl font-extrabold leading-tight">Choose your public name</DialogTitle>
    <DialogDescription className="text-sm text-ink">This name appears on your reviews and replies.</DialogDescription>
    <label className="grid gap-2 text-sm font-medium">Public name<Input defaultValue="Jordan" /></label>
    <Button className="w-full">Save name</Button>
  </DialogContent></Dialog>
}
const meta = { title: 'Primitives/Dialog', component: Example, subcomponents: { DialogContent }, parameters: { docs: { story: { inline: false, iframeHeight: 420 }, description: { component: 'Radix dialog on a white surface. **`stripe`** adds the brand stripe and is only for a dialog that asks the reader to act (the name prompt, confirmations), at most one per view. `sheet` removes every corner radius for viewport-attached sheets (Notebook History). Fields inside use the light surface.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const ActionDialog: Story = {}
export const Plain: Story = { args: { stripe: false } }
