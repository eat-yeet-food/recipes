import type { Meta, StoryObj } from '@storybook/react-vite'
import { Search } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group'
function Example({ disabled = false }: { disabled?: boolean }) {
  return <div className="max-w-md bg-white p-6"><InputGroup><InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon><InputGroupInput aria-label="Search recipes" placeholder="Search recipes..." disabled={disabled} /></InputGroup></div>
}
const meta = { title: 'Primitives/Input Group', component: Example, subcomponents: { InputGroup, InputGroupAddon, InputGroupInput }, parameters: { layout: 'padded', docs: { description: { component: 'A light field with inline addons (icon, kbd hints, Cancel). The group owns the edge and focus; the inner input is borderless. Used by the search palette.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
