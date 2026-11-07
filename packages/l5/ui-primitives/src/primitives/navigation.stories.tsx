import type { Meta, StoryObj } from '@storybook/react-vite'
import { Link } from './navigation'
const meta = { title: 'Primitives/Navigation Link', component: Link, parameters: { layout: 'padded', docs: { description: { component: 'Router-independent link: renders a real anchor and hands navigation to the app provider. Style text links with the underlined text-action treatment; wrap in `Button asChild` for button-styled navigation.' } } },
  args: { to: '/recipes/$slug', params: { slug: 'new-york-style-pizza' }, children: 'New York Style Pizza', className: 'font-action font-bold text-ink underline decoration-1 underline-offset-4 hover:decoration-2' } } satisfies Meta<typeof Link>
export default meta
export const TextLink: StoryObj<typeof meta> = {}
