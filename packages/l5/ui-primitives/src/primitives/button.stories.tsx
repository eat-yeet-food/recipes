import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Button } from './button'

const meta = {
  title: 'Controls/Button', component: Button,
  args: { children: 'Adjust recipe' },
  parameters: { layout: 'padded', docs: { description: { component: 'Owned action control. Plain sentence-case labels, flat ink fill, cream text, 44px default target. Focus is one inset indicator, never an underline. Use asChild for navigation links. Outline is a compatibility alias for secondary, not an outlined treatment.' } } },
  argTypes: { variant: { control: 'select', options: ['default', 'secondary', 'ghost', 'danger', 'link'] }, size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] } },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>
export const Primary: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Quiet: Story = { args: { variant: 'link', children: 'Cancel' } }
export const Destructive: Story = { args: { variant: 'danger', children: 'Delete saved formula' } }
export const Disabled: Story = { args: { disabled: true, children: 'Apply recipe' } }
export const OnYellow: Story = { decorators: [(Story) => <div className="rounded-surface bg-brand p-8"><Story /></div>], args: { children: 'Use this batch →' } }
export const LongLabel: Story = { decorators: [(Story) => <div className="max-w-56"><Story /></div>], args: { children: 'Use the recommended formula for this oven' } }
export const KeyboardFocus: Story = { play: async ({ canvasElement }) => { const button = within(canvasElement).getByRole('button'); button.focus(); await userEvent.tab(); await userEvent.tab({ shift: true }); await expect(button).toHaveFocus() } }
