import { useEffect, type ReactNode } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { TimerNav } from './timer-nav'

/** Seeds `eatyeet:timers` before rendering, the way cook mode leaves them. */
function Seeded({ timers, children }: { timers: { label: string; minutesFromNow: number; recipe?: boolean }[]; children: ReactNode }) {
  const now = Date.now()
  const stored = timers.map((timer, index) => ({
    id: `story${index}`,
    label: timer.label,
    endsAt: now + timer.minutesFromNow * 60_000,
    rang: timer.minutesFromNow <= 0,
    ...(timer.recipe ? { recipe: { title: 'Pollo Asado', href: '/recipes/pollo-asado' } } : {}),
  }))
  window.localStorage.setItem('eatyeet:timers', JSON.stringify(stored))
  window.dispatchEvent(new Event('eatyeet:timers'))
  useEffect(() => () => { window.localStorage.removeItem('eatyeet:timers'); window.dispatchEvent(new Event('eatyeet:timers')) }, [])
  return <>{children}</>
}

function StoryCanvas({ children }: { children: ReactNode }) {
  return <div data-storybook="">
    <section data-storybook-section="">
      <p data-storybook-eyebrow="">Shell</p>
      <h2>Kitchen timers</h2>
      <p>Hidden until a timer exists; persists across reloads; rings here only.</p>
      <div className="flex justify-end rounded-surface border border-border p-3">{children}</div>
    </section>
  </div>
}

const meta = {
  title: 'Shell/Timers',
  component: TimerNav,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TimerNav>

export default meta
type Story = StoryObj<typeof meta>

export const Running: Story = {
  render: () => <StoryCanvas><Seeded timers={[{ label: 'Simmer · 20 min', minutesFromNow: 18, recipe: true }, { label: 'Rest · 10 min', minutesFromNow: 42 }]}><TimerNav /></Seeded></StoryCanvas>,
}

export const Done: Story = {
  render: () => <StoryCanvas><Seeded timers={[{ label: 'Bake · 13–15 min', minutesFromNow: -1, recipe: true }, { label: 'Proof · 1 hr', minutesFromNow: 35 }]}><TimerNav /></Seeded></StoryCanvas>,
}
