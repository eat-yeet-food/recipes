import type { Meta, StoryObj } from '@storybook/react-vite'
import { FoundationPage, FoundationSection, Swatches, type Token } from './foundation-kit'

const ROLES: Token[] = [
  { name: 'Ink (plum 900)', token: '--color-ink', usage: 'All reading text, filled primary buttons, dark panels, Choice Group tracks, toggle outlines. 17.6:1 on white.' },
  { name: 'Brand pink', token: '--color-brand', usage: 'Logo and headline stickers, the selected state, CTA on plum, pink numbers on plum, avatar and small brand fills. Never text on white (2.4:1).' },
  { name: 'Brand orange', token: '--color-brand-alt', usage: 'Hero blob and gradient end. Never text.' },
  { name: 'Star', token: '--color-star', usage: 'Filled rating stars only (3.5:1 on white).' },
  { name: 'Brand soft', token: '--color-brand-soft', usage: 'Chips: EAT/YEET, 91% EAT, review avatars.' },
  { name: 'Tint', token: '--color-tint', usage: 'Informational asides and History’s current row. Nothing else.' },
  { name: 'On-dark label', token: '--color-on-dark-label', usage: 'Light text on plum (14.7:1).' },
  { name: 'Action hover', token: '--color-action-hover', usage: 'Hover on plum fills.' },
  { name: 'Muted', token: '--color-muted', usage: 'Muted fills, image placeholders, hover rows.' },
  { name: 'Muted foreground', token: '--color-muted-foreground', usage: 'Secondary text (7.9:1). Never opacity-tinted ink.' },
  { name: 'Border', token: '--color-border', usage: 'Dividers and card borders on white.' },
  { name: 'Border on dark', token: '--color-border-on-dark', usage: 'Rules inside plum panels.' },
  { name: 'Input', token: '--color-input', usage: 'Field and checkbox edges (4.8:1).' },
  { name: 'Danger', token: '--color-danger', usage: 'Errors and destructive actions only.' },
  { name: 'Danger soft', token: '--color-danger-soft', usage: 'Error callout background.' },
]
const RAMP: Token[] = ['950', '900', '800', '700', '600', '400'].map((step) => ({ name: `Plum ${step}`, token: `--color-plum-${step}`, usage: { '950': 'Hero gradient start', '900': '= ink', '800': 'Hero gradient middle', '700': '= action hover', '600': 'Lightest plum behind small pink text (4.8:1)', '400': 'Gradient flare, far right only' }[step]! }))

const meta = { title: 'Foundations/Color', parameters: { layout: 'fullscreen' } } satisfies Meta
export default meta
export const Roles: StoryObj<typeof meta> = { render: () => <FoundationPage title="Color" intro="Plum + pink. Components use role tokens only; the plum ramp feeds roles and gradients. Raw values and var() escapes are rejected by the checker.">
  <FoundationSection title="Roles"><Swatches tokens={ROLES} /></FoundationSection>
</FoundationPage> }
export const PlumRamp: StoryObj<typeof meta> = { render: () => <FoundationPage title="Plum ramp" intro="Named for the token handbook; not for direct use in components.">
  <FoundationSection title="Ramp"><Swatches tokens={RAMP} /></FoundationSection>
</FoundationPage> }
export const SelectedLook: StoryObj<typeof meta> = { render: () => <FoundationPage title="One selected look" intro="Selected is always the pink fill with a plum label: Choice Group items, pressed Toggles, the highlighted search result.">
  <FoundationSection title="Pairs"><div className="flex flex-wrap gap-3">
    <span className="rounded-control bg-brand px-4 py-2 font-action text-sm font-bold text-ink">Selected</span>
    <span className="rounded-control px-4 py-2 font-action text-sm font-bold text-ink shadow-[inset_0_0_0_1.5px_currentColor]">Off</span>
    <span className="rounded-control bg-ink px-4 py-2 font-action text-sm font-bold text-brand">Pink on plum</span>
  </div></FoundationSection>
</FoundationPage> }
