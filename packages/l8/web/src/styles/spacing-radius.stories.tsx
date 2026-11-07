import type { Meta, StoryObj } from '@storybook/react-vite'
import { FoundationPage, FoundationSection, TokenTable, type Token } from './foundation-kit'
const TOKENS: Token[] = [
  { name: 'Control radius', token: '--radius-control', usage: 'Buttons, toggles, chips, avatar (a circle)' },
  { name: 'Field radius', token: '--radius-field', usage: 'Fields, panels, callouts, list highlights' },
  { name: 'Surface radius', token: '--radius-surface', usage: 'Cards, dialogs' },
  { name: 'Choice radius', token: '--radius-choice', usage: 'Choice Group track' },
  { name: 'Choice inset', token: '--spacing-choice-inset', usage: 'Track padding and gap' },
  { name: 'Choice item radius', token: '--radius-choice-item', usage: 'Outer radius minus inset; never set independently' },
  { name: 'Filter radius', token: '--radius-filter', usage: 'Checkbox, filter rows, kbd, thumbnails' },
  { name: 'Filter row', token: '--spacing-filter-row', usage: 'Minimum filter row height' },
  { name: 'Site width', token: '--layout-site-max', usage: 'Page max width' },
  { name: 'Hero width', token: '--layout-hero-max', usage: 'Hero grid max width' },
  { name: 'Recipe copy', token: '--layout-recipe-copy', usage: 'Recipe reading measure' },
]
const meta = { title: 'Foundations/Spacing & Radius', parameters: { layout: 'fullscreen' } } satisfies Meta
export default meta
export const Tokens: StoryObj<typeof meta> = { render: () => <FoundationPage title="Spacing & Radius" intro="Five radii by role. Tailwind’s generic radii and arbitrary radii are not used; nested radii follow outer minus inset.">
  <FoundationSection title="Tokens"><TokenTable tokens={TOKENS} /></FoundationSection>
</FoundationPage> }
