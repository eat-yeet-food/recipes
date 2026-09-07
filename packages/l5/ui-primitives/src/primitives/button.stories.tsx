import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Button } from './button'
import { Trash2 } from 'lucide-react'

const meta = {
  title: 'Controls/Button', component: Button,
  args: { children: 'Adjust recipe' },
  parameters: { layout: 'padded', docs: { description: { component: 'Filled and outlined actions retain their padding and plain labels. Borderless text actions (link, ghost, quiet-on-ink) are flush, underlined, and have no padding or hover fill; their minimum target is 24px with outward keyboard focus. Icon sizes retain dedicated targets. Use asChild for navigation links. Outline remains a compatibility alias for secondary; utility owns the thin border.' } } },
  argTypes: { variant: { control: 'select', options: ['default', 'secondary', 'ghost', 'utility', 'on-ink', 'quiet-on-ink', 'danger', 'link'] }, size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] } },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>
export const Primary: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Quiet: Story = { args: { variant: 'link', children: 'Cancel' } }
export const Ghost: Story = { args: { variant: 'ghost', children: 'New formula' } }
export const TextActionOnYellow: Story = { decorators: [(Story) => <div className="max-w-80 bg-brand p-6"><p className="mb-4 text-sm font-bold">Oven method</p><Story /></div>], args: { variant: 'link', children: 'Use recommended formula for Outdoor Oven' } }
export const DisabledTextAction: Story = { args: { variant: 'link', disabled: true, children: 'Make default' } }
export const IconAction: Story = { args: { variant: 'ghost', size: 'icon', 'aria-label': 'Delete formula', children: <Trash2 /> } }
export const Utility: Story = { args: { variant: 'utility', size: 'sm', children: 'Print Recipe' } }
export const OnInk: Story = { decorators: [(Story) => <div className="rounded-field bg-ink p-6"><Story /></div>], args: { variant: 'on-ink', children: 'Save formula' } }
export const DisabledOnInk: Story = { decorators: [(Story) => <div className="rounded-field bg-ink p-6"><Story /></div>], args: { variant: 'on-ink', disabled: true, children: 'Save new' } }
export const QuietOnInk: Story = { decorators: [(Story) => <div className="rounded-field bg-ink p-6"><Story /></div>], args: { variant: 'quiet-on-ink', children: 'New formula' } }
export const Destructive: Story = { args: { variant: 'danger', children: 'Delete saved formula' } }
export const Disabled: Story = { args: { disabled: true, children: 'Apply recipe' } }
export const OnYellow: Story = { decorators: [(Story) => <div className="rounded-surface bg-brand p-8"><Story /></div>], args: { children: 'Use this batch →' } }
export const LongLabel: Story = { decorators: [(Story) => <div className="max-w-56"><Story /></div>], args: { children: 'Use the recommended formula for this oven' } }
export const KeyboardFocus: Story = { play: async ({ canvasElement }) => { const button = within(canvasElement).getByRole('button'); button.focus(); await userEvent.tab(); await userEvent.tab({ shift: true }); await expect(button).toHaveFocus() } }
