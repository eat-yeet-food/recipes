'use client'
import { useEffect, useState } from 'react'
import { CountStepper } from './kitchen-ui'

const validCount = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 99

/**
 * Today's batch lives in `?count=` so a reload or a printed page keeps it.
 * Pass `initial` when the server already read the URL; otherwise the count is
 * read after hydration so cached HTML stays identical for everyone.
 */
export function useTodayCount(usual: number, initial?: number) {
  const [count, setCount] = useState(validCount(initial) ? initial : usual)
  useEffect(() => {
    if (initial !== undefined) return
    const fromUrl = Number(new URL(window.location.href).searchParams.get('count'))
    if (validCount(fromUrl)) setCount(fromUrl)
  }, [initial])
  const change = (next: number) => {
    setCount(next)
    const url = new URL(window.location.href)
    if (next === usual) url.searchParams.delete('count')
    else url.searchParams.set('count', String(next))
    window.history.replaceState(window.history.state, '', url)
  }
  return [count, change] as const
}

/** "Making 6 pizzas today" with a stepper. Changes only this bake, never a saved formula. */
export function TodayBatch({ count, noun, plural, note, onChange }: {
  count: number
  /** Noun for the current count, e.g. "pizza" or "pizzas". */
  noun: string
  plural: string
  note?: string
  onChange: (count: number) => void
}) {
  return <div data-today-batch="" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-field bg-tint px-4 py-3">
    <div className="grid">
      <p className="font-action text-[15px] font-bold">Making {count} {noun} today</p>
      {note ? <p className="text-[13px] leading-snug text-muted-foreground">{note}</p> : null}
    </div>
    <div className="print:hidden"><CountStepper label={`How many ${plural} today`} unit={plural} value={count} onChange={onChange} /></div>
  </div>
}
