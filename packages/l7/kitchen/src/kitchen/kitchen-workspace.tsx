'use client'
import { useCallback, useId, type ReactNode } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { ChangeStrip, DoughDock, kitchenPageClass } from './kitchen-ui'
import type { KitchenChange, KitchenRecipe } from './kitchen-plugin'
import { Callout } from '@eat-yeet/l5-ui-primitives/primitives/callout'
import { Textarea } from '@eat-yeet/l5-ui-primitives/primitives/textarea'

/**
 * Shared editing layout for saved and unsaved formulas: the app's editor on
 * the left, its dough results pinned on the right (docked on phones).
 */
export function KitchenWorkspace({ kitchen, state, onChange, resetKey, errors, onErrorsChange, header, changes, onReset, notes, aside, dockAction, footer }: {
  kitchen: KitchenRecipe
  state: unknown
  onChange: (state: unknown) => void
  resetKey: number
  errors: string[]
  onErrorsChange: (errors: string[]) => void
  header: ReactNode
  /** Shown with the dough results, which never move the editor's controls. */
  changes: KitchenChange[]
  onReset: () => void
  notes?: ReactNode
  aside?: ReactNode
  dockAction: ReactNode
  footer?: ReactNode
}) {
  const { plugin, recipe, config } = kitchen
  const { Editor, Results } = plugin
  const totals = plugin.totals(recipe, config, state)
  const errorsId = useId()
  const strip = <ChangeStrip tone="ink" changes={changes} onReset={onReset} />
  const reportErrors = useCallback((next: string[]) => onErrorsChange(next), [onErrorsChange])
  return <div data-kitchen-workspace="" className={cn(kitchenPageClass, 'pt-7 pb-16')}>
    {header}
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-14 lg:grid-cols-[minmax(0,1fr)_384px]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
        <Editor recipe={recipe} config={config} state={state} onChange={onChange} onErrorsChange={reportErrors} resetKey={resetKey} />
        {errors.length > 0 && <Callout id={errorsId} tone="danger">
          <strong className="font-action">Fix these to save and see updated weights:</strong>
          <ul className="mt-1 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Callout>}
        {notes}
        {footer}
      </div>
      <aside aria-label="Your dough" className="sticky top-24 hidden gap-6 lg:grid">
        <Results recipe={recipe} config={config} state={state} />
        {strip}
        {aside}
      </aside>
    </div>
    <DoughDock total={totals.total} detail={totals.detail} changeCount={changes.length} action={dockAction}>
      <Results recipe={recipe} config={config} state={state} docked />
      {strip}
    </DoughDock>
  </div>
}

/** Plain notes field on the white page; owned here so formula pages share it. */
export function KitchenNotes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  return <section aria-labelledby={`${id}-heading`} className="grid gap-2.5">
    <h2 id={`${id}-heading`} className="font-action text-title-sm font-bold">Notes</h2>
    <label htmlFor={`${id}-notes`} className="sr-only">Notes</label>
    <Textarea id={`${id}-notes`} surface="underline" rows={3} maxLength={2000} value={value} onChange={(event) => onChange(event.target.value)}
      placeholder="Fermentation times, oven temperature, what to try next…" className="resize-y leading-relaxed" />
    <p className="text-xs text-muted-foreground">{value.length}/2000</p>
  </section>
}
