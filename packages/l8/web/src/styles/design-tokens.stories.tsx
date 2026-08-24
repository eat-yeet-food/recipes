import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { APP_CONFIG } from '@/lib/app-config'

type Token = { name: string; token: string; usage: string }

const APP_TOKENS: Token[] = [
  { name: 'Brand', token: '--color-brand', usage: 'CTAs, links, "Yeet"' },
  { name: 'Brand Strong', token: '--color-brand-strong', usage: 'CTA hover' },
  { name: 'Ink', token: '--color-ink', usage: 'Tailwind body text, nav and footer chrome' },
  { name: 'Tint', token: '--color-tint', usage: 'home hero field' },
  { name: 'Highlight', token: '--color-highlight', usage: 'warm accent' },
  { name: 'Warm Deep', token: '--color-warm-deep', usage: 'secondary surface' },
  { name: 'Support Strong', token: '--color-support-strong', usage: 'eyebrows' },
]

const RECIPE_TOKENS: Token[] = [
  { name: 'Gray', token: '--yeet-gray', usage: 'recipe body ink' },
  { name: 'Tomato', token: '--yeet-tomato', usage: 'kickers and markers' },
  { name: 'Tomato Strong', token: '--yeet-tomato-strong', usage: 'small recipe metadata' },
  { name: 'Pink', token: '--yeet-pink', usage: 'link underline, card shadow' },
  { name: 'Light Pink', token: '--yeet-light-pink', usage: 'callout panels, metadata cells' },
  { name: 'Cream', token: '--yeet-cream', usage: 'warm surface' },
]

const SYSTEM_TOKENS: Token[] = [
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
      <Swatches tokens={RECIPE_TOKENS} scope="yeet" />
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
  return (
    <div data-storybook-form-row="">
      <label>
        <span>Search</span>
        <input type="search" value="pizza" readOnly />
      </label>
      <label>
        <span>Course</span>
        <select defaultValue="mains">
          <option value="mains">Mains</option>
          <option value="desserts">Desserts</option>
        </select>
      </label>
      <div data-storybook-chip-row="">
        <button type="button" aria-pressed="true">
          Mains
        </button>
        <button type="button" aria-pressed="false">
          Vegetarian
        </button>
        <button type="button" disabled>
          Unavailable
        </button>
      </div>
    </div>
  )
}

const meta = {
  title: 'Web/Design Tokens',
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
