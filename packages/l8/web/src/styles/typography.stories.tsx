import type { Meta, StoryObj } from '@storybook/react-vite'
import { FoundationPage, FoundationSection, TokenTable, type Token } from './foundation-kit'

const SCALE: Token[] = [
  { name: 'Hero', token: '--text-hero', usage: 'Home headline (Bowlby)' },
  { name: 'Wordmark', token: '--text-wordmark', usage: 'Large wordmark lockup' },
  { name: 'Display', token: '--text-display', usage: 'PageTitle display: brand bands (Bowlby)' },
  { name: 'Page', token: '--text-page', usage: 'PageTitle standard, section headings on home' },
  { name: 'Section', token: '--text-section', usage: 'SectionTitle, recipe body h2' },
  { name: 'Title', token: '--text-title', usage: 'Card-group and rating titles' },
  { name: 'Title small', token: '--text-title-sm', usage: 'Catalog card titles, Notebook panel titles' },
  { name: 'Body small', token: '--text-body-sm', usage: 'Dense reading rows' },
  { name: 'Caption', token: '--text-caption', usage: 'Hints, timestamps' },
  { name: 'Micro', token: '--text-micro', usage: 'Small eyebrows, kbd, footer' },
  { name: 'Eyebrow tracking', token: '--tracking-eyebrow', usage: 'Uppercase eyebrows' },
  { name: 'Label tracking', token: '--tracking-label', usage: 'Uppercase buttons, breadcrumbs, meta' },
]
const meta = { title: 'Foundations/Typography', parameters: { layout: 'fullscreen' } } satisfies Meta
export default meta
export const Scale: StoryObj<typeof meta> = { render: () => <FoundationPage title="Typography" intro="Avenir for reading, Geller for headings, Bowlby for the brand. Tailwind's xs–2xl remain; these name every other size. Arbitrary sizes and letter-spacing fail the checker.">
  <FoundationSection title="Specimens"><div className="grid gap-4 text-ink">
    <p className="m-0 font-hero text-display leading-none">SAVORY, SWEET</p>
    <p className="m-0 font-display text-page font-bold leading-tight">New York Style Pizza</p>
    <p className="m-0 font-display text-section font-bold">Ingredients</p>
    <p className="m-0 font-display text-title font-extrabold">Rate this recipe</p>
    <p className="m-0 text-base">A high-hydration dough mixed cold and fermented for 2–3 days.</p>
    <p className="m-0 text-caption text-muted-foreground">Edited 2 min ago</p>
    <p className="m-0 font-action text-xs font-bold uppercase tracking-eyebrow">Top Eats</p>
  </div></FoundationSection>
  <FoundationSection title="Tokens"><TokenTable tokens={SCALE} /></FoundationSection>
</FoundationPage> }
