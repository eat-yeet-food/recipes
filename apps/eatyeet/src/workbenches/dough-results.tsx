'use client'
import { useId } from 'react'
import type { DoughWorkbenchState } from './dough-workbench-model'
import { doughRows } from './dough-kitchen-model'

/** The ink result panel: yellow total, ingredient labels left and tabular weights right. */
export function DoughResults({ state }: { state: DoughWorkbenchState }) {
  const id = useId()
  const { total, totalDetail, rows, levainBuild } = doughRows(state)
  return <section aria-labelledby={id} data-dough-results="" className="grid gap-4 rounded-field bg-ink p-5 text-action-label">
    <h2 id={id} className="font-action text-2xl leading-tight font-bold text-brand">Your dough</h2>
    <p className="grid gap-2">
      <span className="font-action text-[34px] leading-none font-bold tabular-nums text-brand">{total}</span>
      <span className="text-sm">Total dough for {totalDetail}</span>
    </p>
    <dl className="grid">
      {rows.map((row) => <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-border-on-ink py-2.5 text-[15px] leading-snug">
        <dt className="min-w-0">{row.label}</dt>
        <dd className="m-0 whitespace-nowrap text-right font-action font-bold tabular-nums">{row.detail && <span className="mr-1.5 font-body text-[13px] font-normal">{row.detail}</span>}{row.amount}</dd>
      </div>)}
    </dl>
    {levainBuild && <p className="border-t border-border-on-ink pt-3 text-[13px] leading-relaxed">Levain build: {levainBuild}</p>}
  </section>
}
