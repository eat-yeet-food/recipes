import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Button } from './button'
import { Trash2 } from 'lucide-react'

const usage = `**When to use:** any action. Filled \`default\` (plum, light label) is the one primary action in a group; \`utility\` (thin plum outline) for page utilities such as Print or History; \`link\` for quiet, flush text actions; \`danger\` only for destructive actions.

**On dark surfaces** (plum panels, the hero): \`on-dark\` is the pink fill with a plum label; \`quiet-on-dark\` is the flush text action in the light label color.

**When not to use:** on/off state belongs to **Toggle**; one-of-several choices belong to **Choice Group**; navigation uses \`asChild\` with a real anchor.

**Do:** keep labels plain (never underlined unless the variant is a text action). **Don't:** override colors per call site, put two filled actions side by side, or place filled buttons on solid pink.`

const meta = {
  title: 'Primitives/Button', component: Button,
  args: { children: 'Save remix' },
  parameters: { layout: 'padded', docs: { description: { component: usage } } },
  argTypes: { variant: { control: 'select', options: ['default', 'utility', 'ghost', 'link', 'on-dark', 'quiet-on-dark', 'danger'] }, size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] } },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>
const OnDark = (Story: () => React.ReactNode) => <div className="rounded-field bg-ink p-6"><Story /></div>
export const Primary: Story = {}
export const Utility: Story = { args: { variant: 'utility', size: 'sm', children: 'Print Recipe' } }
export const TextAction: Story = { args: { variant: 'link', children: 'Cancel' } }
export const Ghost: Story = { args: { variant: 'ghost', children: 'New remix' } }
export const DisabledTextAction: Story = { args: { variant: 'link', disabled: true, children: 'Make default' } }
export const IconAction: Story = { args: { variant: 'ghost', size: 'icon', 'aria-label': 'Delete remix', children: <Trash2 /> } }
export const OnDarkSurface: Story = { decorators: [OnDark], args: { variant: 'on-dark', children: 'Save formula' } }
export const DisabledOnDarkSurface: Story = { decorators: [OnDark], args: { variant: 'on-dark', disabled: true, children: 'Save new' } }
export const QuietOnDarkSurface: Story = { decorators: [OnDark], args: { variant: 'quiet-on-dark', children: 'Undo' } }
export const Destructive: Story = { args: { variant: 'danger', children: 'Delete remix' } }
export const Disabled: Story = { args: { disabled: true, children: 'Apply recipe' } }
export const LongLabel: Story = { decorators: [(Story) => <div className="max-w-56"><Story /></div>], args: { children: 'Use the recommended formula for this oven' } }
export const KeyboardFocus: Story = { play: async ({ canvasElement }) => { const button = within(canvasElement).getByRole('button'); button.focus(); await userEvent.tab(); await userEvent.tab({ shift: true }); await expect(button).toHaveFocus() } }
