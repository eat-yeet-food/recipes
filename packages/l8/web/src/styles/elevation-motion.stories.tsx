import type { Meta, StoryObj } from '@storybook/react-vite'
import { FoundationPage, FoundationSection, TokenTable, type Token } from './foundation-kit'
const TOKENS: Token[] = [
  { name: 'Card', token: '--shadow-card', usage: 'Sticky nav hairline' },
  { name: 'Raised', token: '--shadow-raised', usage: 'Notices, skip link' },
  { name: 'Overlay', token: '--shadow-overlay', usage: 'Menus, the search palette' },
  { name: 'Glow', token: '--shadow-glow', usage: 'The mobile hero card only' },
  { name: 'Fast', token: '--transition-fast', usage: 'Hover and focus' },
  { name: 'Medium', token: '--transition-medium', usage: 'Card lift' },
  { name: 'Nav', token: '--transition-nav', usage: 'Sticky chrome' },
]
const meta = { title: 'Foundations/Elevation & Motion', parameters: { layout: 'fullscreen' } } satisfies Meta
export default meta
export const Tokens: StoryObj<typeof meta> = { render: () => <FoundationPage title="Elevation & Motion" intro="Catalog cards are flat; elevation is for things that float. Reduced motion disables transitions.">
  <FoundationSection title="Specimens"><div className="flex flex-wrap gap-6">
    {['shadow-card', 'shadow-raised', 'shadow-overlay'].map((c) => <div key={c} className={`grid size-32 place-items-center rounded-surface bg-white text-sm ${c}`}>{c.replace('shadow-', '')}</div>)}
  </div></FoundationSection>
  <FoundationSection title="Tokens"><TokenTable tokens={TOKENS} /></FoundationSection>
</FoundationPage> }
