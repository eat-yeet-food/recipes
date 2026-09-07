import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { Select } from '@eat-yeet/l5-ui-primitives/primitives/select'
import { ChoiceGroup } from '@eat-yeet/l5-ui-primitives/primitives/choice-group'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { APP_CONFIG } from '@/lib/app-config'

type Token = { name: string; token: string; usage: string }

const APP_TOKENS: Token[] = [
 { name: 'Sunshine', token: '--color-brand', usage: 'Expressive fields and brand mark; never small text on white' },
 { name: 'Ink', token: '--color-ink', usage: 'Reading and primary controls' },
 { name: 'Action label', token: '--color-action-label', usage: 'Cream text inside ink actions, including on yellow' },
 { name: 'Action hover', token: '--color-action-hover', usage: 'Warm dark hover, with cream labels' },
 { name: 'Golden orange', token: '--color-brand-alt', usage: 'Occasional graphic accent and dough illustration' },
 { name: 'Quiet yellow', token: '--color-tint', usage: 'Occasional prose callouts only; not controls or facts' },
 { name: 'Checkbox edge', token: '--color-input', usage: 'Functional checkbox boundary; text fields use a flat ink fill' },
 { name: 'Reading divider', token: '--color-border', usage: 'Rules on white reading surfaces' },
 { name: 'Yellow divider', token: '--color-border-on-brand', usage: 'Ink-based rules directly on yellow surfaces' },
 { name: 'Ink divider', token: '--color-border-on-ink', usage: 'Light rules inside ink workbench panels' },
 { name: 'Muted ink', token: '--color-muted-foreground', usage: 'Secondary readable text, no opacity mixing' },
 { name: 'Error', token: '--color-danger', usage: 'Genuine validation and destructive actions only' },
]

const SYSTEM_TOKENS: Token[] = [
 {name:'Group outer radius',token:'--radius-choice',usage:'Selection container'},
 {name:'Group inset',token:'--spacing-choice-inset',usage:'Padding and gap'},
 {name:'Inner radius',token:'--radius-choice-item',usage:'Outer radius minus inset; never independently rounded'},
 {name:'Field radius',token:'--radius-field',usage:'Inputs and selects'},
 {name:'Filter row radius',token:'--radius-filter',usage:'Compact clickable filter labels'},
 {name:'Filter row minimum',token:'--spacing-filter-row',usage:'Minimum height of the full clickable filter label'},
 {name:'Compact checkbox',token:'--spacing-checkbox-compact',usage:'Visible checkbox size inside compact filter rows'},
 {name:'Surface radius',token:'--radius-surface',usage:'Cards and callouts'},
  { name: 'Body Font', token: '--font-body', usage: 'body text' },
  { name: 'Display Font', token: '--font-display', usage: 'headings' },
  { name: 'Hero Font', token: '--font-hero', usage: 'hero lockup' },
  { name: 'Action Font', token: '--font-action', usage: 'recipe controls' },
  { name: 'Site Width', token: '--layout-site-max', usage: 'page max width' },
  { name: 'Page X', token: '--spacing-page-x', usage: 'default page gutters' },
  { name: 'Section Y', token: '--spacing-section-y', usage: 'vertical section rhythm' },
  { name: 'Mobile', token: '--breakpoint-mobile', usage: 'small layout switch' },
  { name: 'Desktop', token: '--breakpoint-desktop', usage: 'desktop layout switch' },
  { name: 'Nav Z', token: '--z-nav', usage: 'site chrome stack' },
  { name: 'Dialog Z', token: '--z-dialog', usage: 'modal stack' },
  { name: 'Fast Motion', token: '--transition-fast', usage: 'hover and focus' },
  { name: 'Nav Motion', token: '--transition-nav', usage: 'sticky chrome, motion' },
]

function StorySection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section data-storybook-section="">
      <p data-storybook-eyebrow="">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StoryCanvas({ children }: { children: ReactNode }) {
  return <div data-storybook="">{children}</div>
}

function TypographyScale() {
  return (
    <div data-storybook-type-scale="">
      <div>
        <p data-storybook-label="">Display</p>
        <h3>New York Style Pizza</h3>
      </div>
      <div>
        <p data-storybook-label="">Body</p>
        <p>
          A high-hydration New York-style pizza dough mixed cold, fermented for
          2-3 days, and baked hot with tomato sauce and frozen cheese.
        </p>
      </div>
      <div>
        <p data-storybook-label="">Metadata</p>
        <p data-storybook-meta="">By Patrick Hogan, Mains, 3 pizzas</p>
      </div>
    </div>
  )
}

function Swatches({ tokens, scope }: { tokens: Token[]; scope?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [resolved, setResolved] = useState<Record<string, string>>({})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const style = getComputedStyle(el)
    setResolved(Object.fromEntries(tokens.map((t) => [t.token, style.getPropertyValue(t.token).trim()])))
  }, [tokens])

  return (
    <div ref={ref} data-storybook-swatches="" className={scope}>
      {tokens.map((t) => (
        <div key={t.token} data-storybook-swatch="">
          <span style={{ backgroundColor: `var(${t.token})` }} />
          <strong>{t.name}</strong>
          <code>{resolved[t.token] || t.token}</code>
          <small>{t.usage}</small>
        </div>
      ))}
    </div>
  )
}

function ColorTokenGrid() {
  return (
    <div data-storybook-stack="">
      <Swatches tokens={APP_TOKENS} />

    </div>
  )
}

function TokenTable({ tokens }: { tokens: Token[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [resolved, setResolved] = useState<Record<string, string>>({})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const style = getComputedStyle(el)
    setResolved(Object.fromEntries(tokens.map((t) => [t.token, style.getPropertyValue(t.token).trim()])))
  }, [tokens])

  return (
    <div ref={ref} data-storybook-token-table="">
      {tokens.map((token) => (
        <div key={token.token}>
          <strong>{token.name}</strong>
          <code>{token.token}</code>
          <span>{resolved[token.token] || token.token}</span>
          <small>{token.usage}</small>
        </div>
      ))}
    </div>
  )
}

function FormStates() {
  const [mode, setMode] = useState('weights')
  return <div data-storybook-form-row="">
    <label><span>Search</span><Input type="search" defaultValue="pizza" /></label>
    <label><span>Course</span><Select defaultValue="mains"><option value="mains">Mains</option><option value="desserts">Desserts</option></Select></label>
    <ChoiceGroup label="Input mode" value={mode} onChange={setMode} options={[{ value: 'weights', label: 'Weights' }, { value: 'target', label: 'Target batch' }]} />
    <div data-storybook-chip-row=""><Button>Apply recipe</Button><Button disabled>Unavailable</Button></div>
  </div>
}

const meta = {
  title: 'Foundations/Design Tokens',
  component: ColorTokenGrid,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Typography: Story = {
  render: () => (
    <StoryCanvas>
      <header data-storybook-header="">
        <p data-storybook-eyebrow="">{APP_CONFIG.siteName} Storybook</p>
        <h1>Design Tokens</h1>
      </header>
      <StorySection eyebrow="Design System" title="Typography Scale">
        <TypographyScale />
      </StorySection>
    </StoryCanvas>
  ),
}

export const ColorTokens: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Color Tokens">
        <ColorTokenGrid />
      </StorySection>
    </StoryCanvas>
  ),
}

export const ThemeContract: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Theme Contract">
        <TokenTable tokens={SYSTEM_TOKENS} />
      </StorySection>
    </StoryCanvas>
  ),
}

export const FormsAndFilterStates: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection eyebrow="Design System" title="Forms and Filter States">
        <FormStates />
      </StorySection>
    </StoryCanvas>
  ),
}
