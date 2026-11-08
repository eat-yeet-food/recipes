import type { Meta, StoryObj } from '@storybook/react-vite'
import { Breadcrumbs } from './breadcrumbs'
const meta = { title: 'Patterns/Breadcrumbs', component: Breadcrumbs, parameters: { layout: 'padded', docs: { description: { component: 'The trail above recipe, Learn and Notebook titles. An ordered list; the last crumb is the current page with `aria-current="page"`. Hidden in print.' } } },
  args: { crumbs: [{ label: 'Home', href: '/' }, { label: 'Recipes', href: '/recipes' }, { label: 'New York Style Pizza' }] } } satisfies Meta<typeof Breadcrumbs>
export default meta
export const Default: StoryObj<typeof meta> = {}
export const LongTrail: StoryObj<typeof meta> = { args: { crumbs: [{ label: 'Home', href: '/' }, { label: 'Remix', href: '/remix' }, { label: 'Slow-Fermented New York Style Pizza with Roasted Garlic', href: '/remix/x' }, { label: 'Bake sheet' }] } }
