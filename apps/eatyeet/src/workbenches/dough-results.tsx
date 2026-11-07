'use client'
import { useId } from 'react'
import type { DoughWorkbenchState } from './dough-workbench-model'
import { doughRows } from './dough-kitchen-model'
import { sourdoughSchedule } from './sourdough-process'
import { pizzaSchedule } from './pizza-process'
import { Eyebrow } from '@eat-yeet/l5-ui-primitives/primitives/typography'

/** The ink result panel: yellow total, ingredient labels left and tabular weights right. */
export function DoughResults({ state }: { state: DoughWorkbenchState }) {
  const id = useId()
  const { total, totalDetail, rows, levainBuild } = doughRows(state)
  const schedule = state.formula.process ? sourdoughSchedule(state.formula.process) : state.formula.pizzaProcess ? pizzaSchedule(state.formula.pizzaProcess) : null
  return <section aria-labelledby={id} data-dough-results="" className="grid gap-4 rounded-field bg-ink p-5 text-on-dark-label">
    <h2 id={id} className="font-action text-2xl leading-tight font-bold text-brand">Your dough</h2>
    <p className="grid gap-2">
      <span className="font-action text-section leading-none font-bold tabular-nums text-brand">{total}</span>
      <span className="text-sm">Total dough for {totalDetail}</span>
    </p>
    <dl className="grid">
      {rows.map((row) => <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-border-on-dark py-2.5 text-body-sm leading-snug">
        <dt className="min-w-0">{row.label}</dt>
        <dd className="m-0 whitespace-nowrap text-right font-action font-bold tabular-nums">{row.detail && <span className="mr-1.5 font-body text-caption font-normal">{row.detail}</span>}{row.amount}</dd>
      </div>)}
    </dl>
    {schedule && <div className="grid gap-1" data-dough-schedule="">
      <Eyebrow as="h3" id={`${id}-schedule`} tone="on-dark" className="pt-2">Schedule</Eyebrow>
      <ol aria-labelledby={`${id}-schedule`} className="m-0 grid list-none p-0">
        {schedule.map((row) => <li key={row.id} className={row.problem ? 'my-1 grid grid-cols-[52px_minmax(0,1fr)] gap-3 rounded-filter bg-danger-soft p-2 text-sm leading-snug text-ink' : 'grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-t border-border-on-dark py-2 text-sm leading-snug'}>
          <span className={`font-action font-bold tabular-nums ${row.problem ? 'text-danger' : 'text-brand'}`}>{row.time}</span>
          <span>{row.label}{row.problem && <>. {row.problem}</>}</span>
        </li>)}
      </ol>
    </div>}
    {levainBuild && <p className="border-t border-border-on-dark pt-3 text-caption leading-relaxed">Levain build: {levainBuild}</p>}
  </section>
}
