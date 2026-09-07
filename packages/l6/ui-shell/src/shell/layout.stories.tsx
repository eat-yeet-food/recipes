import type { Meta, StoryObj } from '@storybook/react-vite'
import { Footer, Nav } from './layout'
const meta = { title: 'Shell/Layout', component: Footer, subcomponents: { Nav }, args: { siteName: 'Eat / Yeet', wordmark: { first: 'Eat', second: 'Yeet' } }, parameters: { layout: 'fullscreen', docs: { description: { component: 'Shared navigation and footer with text-only wordmarks at their respective sizes, without the doughnut illustration. Named navigation regions, wrapping footer links, real mobile menu, and readable ink labels. The shell uses the same lockup and buttons as the app.' } } } } satisfies Meta<typeof Footer>
export default meta
type Story = StoryObj<typeof meta>
export const SiteFooter: Story = {}
export const Navigation: Story = { render: args => <div className="min-h-80 pt-20"><Nav {...args} pathname="/recipes" onOpenPalette={() => {}} /><p className="p-6">Open the mobile menu at narrow widths. Search opens the app palette in production.</p></div> }
