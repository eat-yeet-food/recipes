'use client'
import { Fragment, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, CloudCheck, CloudOff, History, Minus, Plus, Undo2, X } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@eat-yeet/l5-ui-primitives/primitives/dialog'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { cleanFormulaName, formulaNameError, type KitchenRevision } from './kitchen-client'
import type { KitchenChange } from './kitchen-plugin'

const eyebrow = 'font-action text-[11px] font-bold uppercase tracking-[0.14em]'
export const kitchenPageClass = 'mx-auto w-full max-w-[var(--max-width)] px-6 max-[640px]:px-4'

/** The section's one yellow brand moment: eyebrow, Bowlby title, copy and actions. */
export function KitchenBand({ eyebrow: label, title, children, actions }: { eyebrow: string; title: string; children: ReactNode; actions?: ReactNode }) {
  return <section aria-labelledby="kitchen-title" className="bg-brand text-ink">
    <div className={cn(kitchenPageClass, 'flex flex-wrap items-end justify-between gap-x-10 gap-y-5 py-11 max-[640px]:py-7')}>
      <div className="grid max-w-[640px] gap-3">
        <p className={eyebrow}>{label}</p>
        <h1 id="kitchen-title" className="font-hero text-[64px] leading-[0.92] font-normal max-[640px]:text-[44px]">{title}</h1>
        <div className="text-[17px] leading-relaxed max-[640px]:text-[15px]">{children}</div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-5">{actions}</div>}
    </div>
  </section>
}

export type KitchenCrumb = { label: string; href?: string }

/** Formula and scratch pages: the formula's name is the page heading. */
export function KitchenHeader({ crumbs, title, titleAction, meta, actions }: { crumbs: KitchenCrumb[]; title: string; titleAction?: ReactNode; meta: ReactNode; actions: ReactNode }) {
  return <header className="grid gap-4">
    <nav aria-label="Breadcrumb" className="flex flex-wrap gap-1.5 text-xs leading-[1.6] uppercase text-ink">
      {crumbs.map((crumb, index) => <Fragment key={`${crumb.label}-${index}`}>
        {index > 0 && <span aria-hidden="true">&gt;</span>}
        {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : <span aria-current="page">{crumb.label}</span>}
      </Fragment>)}
    </nav>
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="grid min-w-0 gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <h1 className="min-w-0 break-words font-display text-[44px] leading-[1.05] font-bold max-[640px]:text-[34px]">{title}</h1>
          {titleAction}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px]">{meta}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3 max-[640px]:w-full max-[640px]:[&>*]:flex-1">{actions}</div>
    </div>
  </header>
}

export type SaveState =
  | { kind: 'saved'; at: number | null }
  | { kind: 'saving' }
  | { kind: 'local' }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string; retry?: () => void }

export function timeAgo(at: number | string, now = Date.now()) {
  const time = typeof at === 'number' ? at : Date.parse(at)
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`
  const days = Math.floor(seconds / 86400)
  if (days < 7) return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-days, 'day')
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(timer)
  }, [interval])
  return now
}

/** Announces saves politely; a failed save never claims success. */
export function SaveStatus({ state }: { state: SaveState }) {
  const now = useNow()
  const text = state.kind === 'saved' ? `Saved · ${state.at ? timeAgo(state.at, now) : 'up to date'}`
    : state.kind === 'saving' ? 'Saving…'
    : state.kind === 'local' ? 'Kept in this browser · not saved to your account'
    : state.kind === 'invalid' ? 'Not saved · fix the highlighted values'
    : state.message
  const failed = state.kind === 'error' || state.kind === 'invalid'
  const Icon = failed ? CloudOff : CloudCheck
  return <span role="status" data-save-status={state.kind} className={cn('inline-flex flex-wrap items-center gap-x-1.5 font-action text-[13px] font-bold', failed ? 'text-danger' : 'text-muted-foreground')}>
    <Icon aria-hidden="true" className={failed ? 'size-3.5' : 'size-3.5 text-ink'} />
    {text}
    {state.kind === 'error' && state.retry && <Button variant="link" className="ml-1 text-[13px] text-danger" onClick={state.retry}>Try again</Button>}
  </span>
}

/** What differs from the recipe as written, with a way back to it. */
export function ChangeStrip({ changes, onReset }: { changes: KitchenChange[]; onReset?: () => void }) {
  return <section aria-label="Changed from the recipe" className="flex flex-wrap items-center gap-2.5 border-y border-border py-3.5">
    <h2 className={cn(eyebrow, 'mr-1.5')}>Changed from the recipe</h2>
    {changes.length
      ? <ul className="contents">{changes.map((change) => <ChangeChip key={change.label} change={change} />)}</ul>
      : <p className="text-sm text-muted-foreground">Nothing yet. This matches the recipe.</p>}
    {changes.length > 0 && onReset && <Button variant="link" className="ml-auto gap-1.5 max-[640px]:ml-0" onClick={onReset}><Undo2 aria-hidden="true" className="size-3.5" />Reset to recipe</Button>}
  </section>
}

export function ChangeChip({ change, as: Tag = 'li' }: { change: KitchenChange; as?: 'li' | 'span' }) {
  return <Tag className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-control border border-border bg-white px-3 py-1 text-[13.5px] leading-snug">
    <span>{change.label}</span>
    <s className="text-muted-foreground decoration-1"><span className="sr-only">was </span>{change.from}</s>
    <strong className="font-action font-bold"><span className="sr-only">now </span>{change.to}</strong>
  </Tag>
}

/** One change summary for a History entry or Recent changes row. */
export function changeSummary(changes: KitchenChange[], limit = 2) {
  if (!changes.length) return 'No value changes'
  const shown = changes.slice(0, limit).map((change) => `${change.label} ${change.from} → ${change.to}`)
  return changes.length > limit ? `${shown.join(' · ')} · ${changes.length - limit} more` : shown.join(' · ')
}

/**
 * Names a new or existing formula. Used for Save, Duplicate and Rename, so a
 * formula always has a name before anything is written.
 */
export function NameDialog({ open, onOpenChange, title, description, initialName, submitLabel, onSubmit }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  initialName: string
  submitLabel: string
  /** Resolves to an error message to show beside the field, or null on success. */
  onSubmit: (name: string) => Promise<string | null>
}) {
  const id = useId()
  const [name, setName] = useState(initialName)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(initialName)
    setTouched(false)
    setError('')
  }, [open, initialName])
  const localError = formulaNameError(name)
  const shownError = error || (touched ? localError : '')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (localError || busy) return
    setBusy(true)
    const failure = await onSubmit(cleanFormulaName(name)).catch((reason: unknown) => reason instanceof Error ? reason.message : 'Something went wrong. Please try again.')
    setBusy(false)
    if (failure) setError(failure)
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
    <DialogContent className="gap-4 bg-brand p-6 text-ink sm:max-w-[460px]">
      <DialogTitle className="pr-8 font-action text-2xl font-bold leading-tight">{title}</DialogTitle>
      <DialogDescription className="text-[15px] leading-relaxed text-ink">{description}</DialogDescription>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <div className="grid gap-2">
          <label htmlFor={`${id}-name`} className="font-action text-sm font-bold">Name</label>
          <Input id={`${id}-name`} autoFocus autoComplete="off" maxLength={120} value={name} disabled={busy}
            aria-invalid={Boolean(shownError)} aria-describedby={shownError ? `${id}-error` : `${id}-hint`}
            onBlur={() => setTouched(true)}
            onChange={(event) => { setName(event.target.value); setError('') }} />
          {shownError
            ? <p id={`${id}-error`} role="alert" className="rounded-field bg-danger-soft px-3 py-2 text-sm text-danger">{shownError}</p>
            : <p id={`${id}-hint`} className="text-sm">Up to 80 characters. Each formula needs its own name.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-6">
          <Button variant="link" type="button" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={busy || Boolean(localError)}>{busy ? 'Saving…' : submitLabel}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}

export type KitchenNoticeValue = { message: string; tone?: 'info' | 'error'; action?: { label: string; run: () => void } }

/** Confirmation for data changes, with Undo where the change can be reversed. */
export function KitchenNotice({ notice, onDismiss, raised = false }: { notice: KitchenNoticeValue | null; onDismiss: () => void; raised?: boolean }) {
  const failure = notice?.tone === 'error'
  return <div className={cn('pointer-events-none fixed inset-x-0 z-[var(--z-dialog)] flex justify-center px-4 print:hidden', raised ? 'bottom-[calc(7rem+env(safe-area-inset-bottom))] lg:bottom-6' : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))]')}>
    <div role="status" aria-live="polite" className="contents">
      {notice && <div className={cn('pointer-events-auto flex w-full max-w-[480px] items-center gap-4 rounded-field px-4 py-3 text-[15px] leading-snug shadow-card-hover', failure ? 'bg-danger text-white' : 'bg-ink text-action-label')}>
        <p className="min-w-0 flex-1">{notice.message}</p>
        {notice.action && <Button variant="quiet-on-ink" className={failure ? 'text-white' : undefined} onClick={() => { notice.action!.run(); onDismiss() }}>{notice.action.label}</Button>}
        <Button variant="quiet-on-ink" size="icon-xs" aria-label="Dismiss" className={failure ? 'text-white' : undefined} onClick={onDismiss}><X className="size-4" /></Button>
      </div>}
    </div>
  </div>
}

/** Whole-number stepper with 44px targets, e.g. today's batch on a bake sheet. */
export function CountStepper({ label, value, min = 1, max = 99, unit, onChange }: { label: string; value: number; min?: number; max?: number; unit: string; onChange: (value: number) => void }) {
  const id = useId()
  return <div role="group" aria-labelledby={`${id}-label`} className="inline-flex items-center rounded-control border border-ink bg-white">
    <span id={`${id}-label`} className="sr-only">{label}</span>
    <Button variant="ghost" size="icon" aria-label={`Fewer ${unit}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus className="size-4" /></Button>
    <output aria-live="polite" className="min-w-10 border-x border-border px-2 text-center font-action text-base font-bold tabular-nums">{value}</output>
    <Button variant="ghost" size="icon" aria-label={`More ${unit}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus className="size-4" /></Button>
  </div>
}

const dayLabel = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, new Date(today.getTime() - 86400000))) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}
const clockLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

/** Every saved version, newest first. Restoring adds a new version on top. */
export function HistorySheet({ open, onOpenChange, title, revisions, describe, onRestore, restoring, complete }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  revisions: KitchenRevision[]
  /** Describes a version against the one before it (null for the oldest kept version). */
  describe: (revision: KitchenRevision, previous: KitchenRevision | null) => string
  onRestore: (revision: KitchenRevision) => void
  restoring: string | null
  /** False when older versions were dropped after 100. */
  complete: boolean
}) {
  const groups: { day: string; items: { revision: KitchenRevision; index: number }[] }[] = []
  revisions.forEach((revision, index) => {
    const day = dayLabel(revision.createdAt)
    const group = groups.at(-1)
    if (group?.day === day) group.items.push({ revision, index })
    else groups.push({ day, items: [{ revision, index }] })
  })
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent variant="sheet" data-kitchen-history="" className="top-0 right-0 bottom-0 left-auto flex h-[100dvh] w-full max-w-[440px] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden bg-white p-0 text-ink sm:max-w-[440px] data-open:slide-in-from-right data-closed:slide-out-to-right">
      <header className="shrink-0 border-b border-border px-6 pt-6 pb-4 pr-14">
        <DialogTitle className="flex items-center gap-2 font-action text-2xl font-bold leading-tight"><History aria-hidden="true" className="size-5" />History</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">{title} · every change is kept, up to the last 100 versions.</DialogDescription>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {groups.map((group) => <section key={group.day} aria-label={group.day}>
          <h3 className="px-6 pt-4 pb-1.5 font-action text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{group.day}</h3>
          <ol>
            {group.items.map(({ revision, index }) => {
              const previous = revisions[index + 1] ?? null
              const current = index === 0
              return <li key={revision.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border px-6 py-3 first:border-t-0', current && 'bg-tint')}>
                <p className="text-[15px] leading-snug">{previous || !complete ? describe(revision, previous) : 'Created'}</p>
                {current
                  ? <span className="row-span-2 font-action text-xs font-bold">Current</span>
                  : <Button variant="link" className="row-span-2 text-[13px]" disabled={restoring !== null} aria-label={`Restore the version from ${dayLabel(revision.createdAt)} at ${clockLabel(revision.createdAt)}`} onClick={() => onRestore(revision)}>{restoring === revision.id ? 'Restoring…' : 'Restore'}</Button>}
                <p className="text-[12.5px] text-muted-foreground">{clockLabel(revision.createdAt)}</p>
              </li>
            })}
          </ol>
        </section>)}
      </div>
      <p className="shrink-0 border-t border-border px-6 py-4 text-[13.5px] leading-relaxed text-muted-foreground">Restoring adds a new version on top, so a restore can be undone too.</p>
    </DialogContent>
  </Dialog>
}

/**
 * Phones keep the dough totals docked at the bottom while editing; the
 * button expands the full results panel.
 */
export function DoughDock({ total, detail, children, action }: { total: string; detail: string; children: ReactNode; action: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div data-dough-dock="" className="fixed inset-x-0 bottom-0 z-[var(--z-recipe-actions)] lg:hidden print:hidden">
    <div id={`${id}-panel`} hidden={!open} className="max-h-[65dvh] overflow-y-auto bg-ink px-4 pt-4">{children}</div>
    <div className="flex items-center gap-3 rounded-t-[22px] bg-ink px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-action-label">
      <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen((value) => !value)}
        className="grid min-h-11 min-w-0 flex-1 justify-items-start rounded-field text-left focus-visible:outline-2 focus-visible:outline-action-label focus-visible:outline-offset-2">
        <span className="flex items-center gap-1.5 font-action text-xs font-bold uppercase tracking-[0.12em] text-brand">Your dough {open ? <ChevronDown aria-hidden="true" className="size-3.5" /> : <ChevronUp aria-hidden="true" className="size-3.5" />}</span>
        <span className="flex min-w-0 items-baseline gap-2"><strong className="font-action text-2xl font-bold tabular-nums text-brand">{total}</strong><span className="truncate text-[13px]">{detail}</span></span>
      </button>
      {action}
    </div>
  </div>
}
