import type { ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { ErrorState, NotFound } from './error-states'

function StorySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-storybook-section="">
      <p data-storybook-eyebrow="">States</p>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function StoryCanvas({ children }: { children: ReactNode }) {
  return <div data-storybook="">{children}</div>
}

const meta = {
  title: 'Shell/Error States',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const NotFoundState: Story = {
  name: 'Not Found',
  render: () => (
    <StoryCanvas>
      <StorySection title="Not Found">
        <div data-storybook-surface="">
          <NotFound />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const RenderError: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection title="Render Error">
        <div data-storybook-surface="">
          <ErrorState error={new Error('Something threw while rendering')} reset={() => {}} />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}

export const StaleBuildError: Story = {
  render: () => (
    <StoryCanvas>
      <StorySection title="Stale Build Error">
        <div data-storybook-surface="">
          <ErrorState
            error={new Error('Failed to fetch dynamically imported module: /build/index-abc123.js')}
          />
        </div>
      </StorySection>
    </StoryCanvas>
  ),
}
