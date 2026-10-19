'use client'
import { useCallback, useId, type ReactNode } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { DoughDock, kitchenPageClass } from './kitchen-ui'
import type { KitchenRecipe } from './kitchen-plugin'

/**
 * Shared editing layout for saved and unsaved formulas: the app's editor on
 * the left, its dough results pinned on the right (docked on phones).
 */
export function KitchenWorkspace({ kitchen, state, onChange, resetKey, errors, onErrorsChange, header, notes, aside, dockAction, footer }: {
  kitchen: KitchenRecipe
  state: unknown
  onChange: (state: unknown) => void
  resetKey: number
  errors: string[]
  onErrorsChange: (errors: string[]) => void
  header: ReactNode
  notes?: ReactNode
  aside?: ReactNode
  dockAction: ReactNode
  footer?: ReactNode
}) {
  const { plugin, recipe, config } = kitchen
  const { Editor, Results } = plugin
  const totals = plugin.totals(recipe, config, state)
  const errorsId = useId()
  const reportErrors = useCallback((next: string[]) => onErrorsChange(next), [onErrorsChange])
  return <div data-kitchen-workspace="" className={cn(kitchenPageClass, 'pt-7 pb-16 max-lg:pb-40')}>
    {header}
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-14 lg:grid-cols-[minmax(0,1fr)_384px]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
        <Editor recipe={recipe} config={config} state={state} onChange={onChange} onErrorsChange={reportErrors} resetKey={resetKey} />
        {errors.length > 0 && <div id={errorsId} role="alert" className="rounded-field bg-danger-soft p-4 text-sm text-danger">
          <strong className="font-action">Fix these to save and see updated weights:</strong>
          <ul className="mt-1 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>}
        {notes}
        {footer}
      </div>
      <aside aria-label="Your dough" className="sticky top-24 hidden gap-6 lg:grid">
        <Results recipe={recipe} config={config} state={state} />
        {aside}
      </aside>
    </div>
    <DoughDock total={totals.total} detail={totals.detail} action={dockAction}>
      <Results recipe={recipe} config={config} state={state} />
    </DoughDock>
  </div>
}

/** Plain notes field on the white page; owned here so formula pages share it. */
export function KitchenNotes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  return <section aria-labelledby={`${id}-heading`} className="grid gap-2.5">
    <h2 id={`${id}-heading`} className="font-action text-[22px] font-bold">Notes</h2>
    <label htmlFor={`${id}-notes`} className="sr-only">Notes</label>
    <textarea id={`${id}-notes`} rows={3} maxLength={2000} value={value} onChange={(event) => onChange(event.target.value)}
      placeholder="Fermentation times, oven temperature, what to try next…"
      className="min-h-24 w-full resize-y border-0 border-b border-ink bg-transparent px-0 py-3 font-body text-base leading-relaxed text-ink placeholder:text-muted-foreground focus-visible:border-b-2 focus-visible:outline-none" />
    <p className="text-xs text-muted-foreground">{value.length}/2000</p>
  </section>
}
