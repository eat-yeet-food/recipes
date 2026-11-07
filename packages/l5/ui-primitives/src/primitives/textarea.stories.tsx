import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './textarea'
const meta = { title: 'Primitives/Textarea', component: Textarea, parameters: { layout: 'padded', docs: { description: { component: 'Multi-line field with the same surfaces as Input. The light default is used in the rating card and reply form; `underline` for Notebook notes.' } } },
  render: (args) => <label className="grid max-w-md gap-2 text-sm font-medium text-ink">Review<Textarea placeholder="Share your experience..." {...args} /></label> } satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>
export const Light: Story = {}
export const Underline: Story = { args: { surface: 'underline' } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
export const Disabled: Story = { args: { disabled: true } }
