import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccentRule, Surface } from '@eat-yeet/l5-ui-primitives/primitives/surface'
import { FoundationPage, FoundationSection } from './foundation-kit'
const meta = { title: 'Foundations/Gradients & Accents', parameters: { layout: 'fullscreen' } } satisfies Meta
export default meta
export const Gradients: StoryObj<typeof meta> = { render: () => <FoundationPage title="Gradients & Accents" intro="Two gradients, one token each. The hero gradient stays dark and flares to plum 400 only at the far right. The accent gradient is pink→orange and appears only as the stripe and the accent rule.">
  <FoundationSection title="gradient-hero"><div className="h-24 rounded-surface bg-gradient-hero" /></FoundationSection>
  <FoundationSection title="gradient-accent"><div className="h-6 rounded-control bg-gradient-accent" /></FoundationSection>
  <FoundationSection title="Stripe and accent rule"><div className="grid gap-8 md:grid-cols-2">
    <div><Surface action><p className="m-0 text-sm font-bold">Stripe</p></Surface><p className="mt-3 text-sm">Top of a white card or dialog that asks the reader to act. One per view. Never on catalog cards, read-only panels, plum surfaces or headers.</p></div>
    <div><p className="m-0 font-display text-title font-extrabold">Section title</p><AccentRule className="mt-3" /><p className="mt-3 text-sm">Under a title: 60×3 for sections, 64×4 for page bands.</p></div>
  </div></FoundationSection>
</FoundationPage> }
