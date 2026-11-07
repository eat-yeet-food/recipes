import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from './select'
const meta = { title: 'Primitives/Select', component: Select, parameters: { layout: 'padded', docs: { description: { component: 'Native select with the shared field surfaces (light default or `underline`) and a plum caret. Keeps platform keyboard and assistive-technology behavior. Label it visibly.' } } },
  render: (args) => <label className="grid max-w-xs gap-2 text-sm font-medium text-ink">Oven method<Select {...args}><option>Indoor oven with a preheated baking steel</option><option>Outdoor oven</option></Select></label> } satisfies Meta<typeof Select>
export default meta
type Story = StoryObj<typeof meta>
export const Light: Story = {}
export const Underline: Story = { args: { surface: 'underline' } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
export const Disabled: Story = { args: { disabled: true } }
