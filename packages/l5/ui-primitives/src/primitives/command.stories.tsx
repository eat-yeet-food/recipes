import type { Meta, StoryObj } from '@storybook/react-vite'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from './command'
function Example() {
  return <div className="max-w-lg border border-border bg-white"><Command value="pizza"><CommandInput placeholder="Search recipes..." /><CommandList><CommandGroup>
    <CommandItem value="pizza">New York Style Pizza</CommandItem><CommandItem value="donuts">Raised Donuts</CommandItem><CommandItem value="bread">Sourdough Bread</CommandItem>
  </CommandGroup></CommandList></Command></div>
}
const meta = { title: 'Primitives/Command', component: Example, parameters: { layout: 'padded', docs: { description: { component: 'cmdk list behind the search palette. The input is a light Input Group; the highlighted item uses the shared selected look: pink fill, plum text.' } } } } satisfies Meta<typeof Example>
export default meta
export const Default: StoryObj<typeof meta> = {}
