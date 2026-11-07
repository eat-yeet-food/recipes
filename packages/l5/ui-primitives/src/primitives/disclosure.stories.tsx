import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Disclosure } from './disclosure'
const meta = { title: 'Patterns/Disclosure', component: Disclosure, parameters: { layout: 'padded', docs: { description: { component: 'One show/hide treatment: a full-width trigger with `aria-expanded` and a rotating chevron. Used by search filter groups and Recently deleted. Controlled (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`).' } } },
  args: { label: 'Courses', children: <p className="text-sm">Mains, desserts, breads</p>, className: 'max-w-xs' } } satisfies Meta<typeof Disclosure>
export default meta
type Story = StoryObj<typeof meta>
export const Closed: Story = {}
export const Open: Story = { args: { defaultOpen: true } }
export const Keyboard: Story = { play: async ({ canvasElement }) => {
  const trigger = within(canvasElement).getByRole('button', { name: 'Courses' })
  trigger.focus(); await userEvent.keyboard('{Enter}')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
} }
