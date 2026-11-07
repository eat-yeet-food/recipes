import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Textarea } from './textarea'
import { AccentRule, Surface } from './surface'

const usage = `**Surface** is the white card. Add \`action\` for the **brand stripe**: an 8px pink→orange band along the top.

| Use the stripe | Never use the stripe |
|---|---|
| A white card or dialog that asks the reader to do something: the rating card, the name dialog, a standalone reply form, future confirmations | Catalog cards, read-only panels, dark (plum) surfaces, page headers |

At most **one stripe per view**. An inline form inside a view that already has a striped card gets none. The stripe is a background layer so the card radius clips it; never hand-roll it (the design-system checker fails on copies). Dialogs use \`DialogContent stripe\`.`

const meta = { title: 'Patterns/Surface', component: Surface, parameters: { layout: 'padded', docs: { description: { component: usage } } } } satisfies Meta<typeof Surface>
export default meta
type Story = StoryObj<typeof meta>
export const ActionCard: Story = { render: () => <Surface action className="max-w-md">
  <h3 className="mb-5 font-display text-title font-extrabold leading-tight">Rate this recipe</h3>
  <label className="grid gap-2 text-sm font-medium text-muted-foreground">Review (optional)<Textarea placeholder="Share your experience..." /></label>
  <Button className="mt-5 w-full">Submit Rating</Button>
</Surface> }
export const PlainCard: Story = { render: () => <Surface className="max-w-md"><p className="text-sm">A read-only white card: no stripe.</p></Surface> }
export const StripeAndRule: Story = { name: 'Stripe And Accent Rule', render: () => <div className="grid max-w-3xl gap-8 md:grid-cols-2">
  <Surface action><p className="text-sm font-bold">Stripe: top of an action surface</p></Surface>
  <div><h2 className="font-display text-title font-extrabold">Section title</h2><AccentRule className="mt-3" /><p className="mt-3 text-sm">Accent rule: under a title</p></div>
</div> }
