import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowRight, ChefHat, Clock, FlaskConical, History, Printer, Search, Star, UtensilsCrossed } from 'lucide-react'
import { FoundationPage, FoundationSection } from './foundation-kit'
const ICONS = { ArrowRight, ChefHat, Clock, FlaskConical, History, Printer, Search, Star, UtensilsCrossed }
const meta = { title: 'Foundations/Iconography', parameters: { layout: 'fullscreen' } } satisfies Meta
export default meta
export const Icons: StoryObj<typeof meta> = { render: () => <FoundationPage title="Iconography" intro="Lucide icons at 14–24px in currentColor; decorative icons are aria-hidden. The favicon is the pink-icing doughnut; the app bar uses the text lockup only.">
  <FoundationSection title="Icons"><div className="flex flex-wrap gap-6 text-ink">{Object.entries(ICONS).map(([name, Icon]) => <figure key={name} className="m-0 grid justify-items-center gap-2 text-caption"><Icon aria-hidden="true" className="size-6" />{name}</figure>)}</div></FoundationSection>
  <FoundationSection title="Favicon"><img src="/donut-icon.svg" alt="Pink-icing doughnut favicon" width="96" height="96" /></FoundationSection>
</FoundationPage> }
