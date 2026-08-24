import type { ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { Wordmark } from './wordmark'

const copy = { first: 'Eat', second: 'Yeet' }

function StorySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-storybook-section="">
      <p data-storybook-eyebrow="">Brand</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StoryCanvas({ children }: { children: ReactNode }) {
  return <div data-storybook="">{children}</div>
}

const meta = {
  title: 'Shell/Wordmark',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Sizes: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection title="Wordmark Sizes">
        <div data-storybook-surface="">
          <div data-storybook-stack="">
            <Wordmark copy={copy} size="nav" />
            <Wordmark copy={copy} size="footer" />
            <Wordmark copy={copy} size="hero" />
          </div>
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const OnPhoto: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection title="Photo Treatment">
        <div data-storybook-surface="" className="bg-ink p-8">
          <Wordmark copy={copy} size="hero" onPhoto />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}
