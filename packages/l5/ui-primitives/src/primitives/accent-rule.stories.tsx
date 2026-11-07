import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccentRule } from './surface'
const meta = { title: 'Patterns/Accent Rule', component: AccentRule, parameters: { layout: 'padded', docs: { description: { component: 'The short pink→orange line under a title. `section` (60×3) sits under section headings; `band` (64×4) under page-band titles such as NOTEBOOK. Same gradient as the stripe; never used as a divider or on cards.' } } } } satisfies Meta<typeof AccentRule>
export default meta
type Story = StoryObj<typeof meta>
export const Section: Story = { render: () => <div className="text-center"><h2 className="font-display text-page font-extrabold">Top Eats</h2><AccentRule align="center" className="mt-4" /></div> }
export const Band: Story = { render: () => <div><h1 className="font-hero text-display leading-[0.92]">NOTEBOOK</h1><AccentRule size="band" className="mt-3" /></div> }
