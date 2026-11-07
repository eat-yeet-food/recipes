'use client'
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, CloudCheck, CloudOff, History, Minus, Plus, Undo2, X } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@eat-yeet/l5-ui-primitives/primitives/dialog'
import { Breadcrumbs } from '@eat-yeet/l5-ui-primitives/primitives/breadcrumbs'
import { Callout } from '@eat-yeet/l5-ui-primitives/primitives/callout'
import { AccentRule } from '@eat-yeet/l5-ui-primitives/primitives/surface'
import { Eyebrow, PageTitle, pageTitleClasses } from '@eat-yeet/l5-ui-primitives/primitives/typography'
import { cleanFormulaName, type KitchenRevision } from './kitchen-client'
import type { KitchenChange } from './kitchen-plugin'

export const kitchenPageClass = 'mx-auto w-full max-w-[var(--max-width)] px-6 max-[640px]:px-4'

/** The collection header: white, no fill. Eyebrow, Bowlby title, the accent rule, copy and actions. */
export function KitchenBand({ eyebrow: label, title, children, actions }: { eyebrow?: string; title: string; children: ReactNode; actions?: ReactNode }) {
  return <section aria-labelledby="kitchen-title" className="border-b border-border bg-white text-ink">
    <div className={cn(kitchenPageClass, 'flex flex-wrap items-end justify-between gap-x-10 gap-y-5 py-11 max-[640px]:py-7')}>
      <div className="grid max-w-[640px] gap-3">
        {label && <Eyebrow size="small">{label}</Eyebrow>}
        <PageTitle id="kitchen-title" size="display">{title}</PageTitle>
        <AccentRule size="band" className="mt-1" />
        <div className="text-base leading-relaxed text-muted-foreground">{children}</div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-5">{actions}</div>}
    </div>
  </section>
}

export type KitchenCrumb = { label: string; href?: string }

export const kitchenTitleClass = pageTitleClasses.standard

/** Formula and scratch pages: the formula's name is the page heading, usually a `FormulaTitle`. */
export function KitchenHeader({ crumbs, title, meta, actions }: { crumbs: KitchenCrumb[]; title: ReactNode; meta: ReactNode; actions: ReactNode }) {
  return <header className="grid gap-4">
    <Breadcrumbs crumbs={crumbs} />
    {typeof title === 'string' ? <h1 className={cn('min-w-0 break-words', kitchenTitleClass)}>{title}</h1> : title}
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-body-sm">{meta}</div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 print:hidden">{actions}</div>
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
export function SaveStatus({ state, local = false }: { state: SaveState; local?: boolean }) {
  const now = useNow()
  const text = state.kind === 'saved' ? `Saved${local ? ' in this browser' : ''} · ${state.at ? timeAgo(state.at, now) : 'up to date'}`
    : state.kind === 'saving' ? 'Saving…'
    : state.kind === 'local' ? 'Unsaved · kept in this browser'
    : state.kind === 'invalid' ? 'Not saved · fix the highlighted values'
    : state.message
  const failed = state.kind === 'error' || state.kind === 'invalid'
  const Icon = failed ? CloudOff : CloudCheck
  return <span role="status" data-save-status={state.kind} className={cn('inline-flex flex-wrap items-center gap-x-1.5 font-action text-caption font-bold', failed ? 'text-danger' : 'text-muted-foreground')}>
    <Icon aria-hidden="true" className={failed ? 'size-3.5' : 'size-3.5 text-ink'} />
    {text}
    {state.kind === 'error' && state.retry && <Button variant="link" className="ml-1 text-caption text-danger" onClick={state.retry}>Try again</Button>}
  </span>
}

/** What differs from the recipe as written, with a way back to it. On ink, it sits with the dough results. */
export function ChangeStrip({ changes, onReset, tone = 'page' }: { changes: KitchenChange[]; onReset?: () => void; tone?: 'page' | 'ink' }) {
  const ink = tone === 'ink'
  return <section aria-label="Changed from the recipe" className={cn('flex flex-wrap items-center gap-2.5', ink ? 'rounded-field bg-ink p-5 text-on-dark-label' : 'border-y border-border py-3.5')}>
    <Eyebrow as="h2" size="small" tone={ink ? 'brand' : 'ink'} className={cn('mr-1.5', ink && 'w-full')}>Changed from the recipe</Eyebrow>
    {changes.length
      ? <ul className="contents">{changes.map((change) => <ChangeChip key={change.label} change={change} />)}</ul>
      : <p className={cn('text-sm', !ink && 'text-muted-foreground')}>Nothing yet. This matches the recipe.</p>}
    {changes.length > 0 && onReset && <Button variant={ink ? 'quiet-on-dark' : 'link'} className={cn('gap-1.5', ink ? 'w-full' : 'ml-auto max-[640px]:ml-0')} onClick={onReset}><Undo2 aria-hidden="true" className="size-3.5" />Reset to recipe</Button>}
  </section>
}

export function ChangeChip({ change, as: Tag = 'li' }: { change: KitchenChange; as?: 'li' | 'span' }) {
  return <Tag className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-control border border-border bg-white px-3 py-1 text-caption text-ink leading-snug">
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
 * The editor's title is the formula's name as a field, at title size, so the
 * name edits like every other value. Enter or leaving the field saves it;
 * Escape, or clearing it, puts the old name back. A refused name stays in
 * the field with the reason below it. The page's h1 carries the saved name
 * for assistive technology.
 */
export function FormulaTitle({ name, onRename, autoEdit = false }: {
  name: string
  /** Resolves to an error message to show below the field, or null once renamed. */
  onRename: (name: string) => Promise<string | null> | string | null
  /** Opens with the name selected, e.g. for a new copy. */
  autoEdit?: boolean
}) {
  const id = useId()
  const [value, setValue] = useState(name)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const focused = useRef(false)
  // Follow outside changes (History restore, a copy) unless the reader is typing.
  useEffect(() => { if (!focused.current) setValue(name) }, [name])
  useEffect(() => {
    if (!autoEdit) return
    field.current?.focus()
    field.current?.select()
  }, [autoEdit])
  // Grow with the name so it wraps like a title instead of scrolling sideways.
  useLayoutEffect(() => {
    const el = field.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  const commit = async () => {
    if (busy) return
    const next = cleanFormulaName(value)
    if (!next || next === name) { setValue(name); setError(''); return }
    setBusy(true)
    const failure = await Promise.resolve(onRename(next)).catch((reason: unknown) => reason instanceof Error ? reason.message : 'The name could not be saved. Please try again.')
    setBusy(false)
    if (failure) setError(failure)
    else setValue(next)
  }
  const keys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); void commit() }
    if (event.key === 'Escape') { event.preventDefault(); setValue(name); setError('') }
  }
  return <div className="grid min-w-0 gap-1" data-formula-title="">
    <h1 className="sr-only">{name}</h1>
    <label htmlFor={`${id}-name`} className="font-action text-caption font-bold text-muted-foreground"><span className="sr-only">Formula </span>Name</label>
    <textarea ref={field} id={`${id}-name`} rows={1} autoComplete="off" spellCheck={false} maxLength={80} value={value} readOnly={busy}
      aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
      onChange={(event) => { setValue(event.target.value.replace(/\s*\n\s*/g, ' ')); setError('') }}
      onKeyDown={keys} onFocus={() => { focused.current = true }} onBlur={() => { focused.current = false; if (!error) void commit() }}
      className={cn(kitchenTitleClass, 'block w-full min-w-0 resize-none overflow-hidden border-b-2 border-ink bg-transparent p-0 pb-1 text-ink outline-none focus-visible:border-b-4 aria-invalid:border-danger')} />
    {error
      ? <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error} Press Escape to keep “{name}”.</p>
      : busy && <p role="status" className="text-caption text-muted-foreground">Saving the name…</p>}
  </div>
}

export type KitchenNoticeValue = { message: string; tone?: 'info' | 'error'; action?: { label: string; run: () => void } }

/** Confirmation for data changes, with Undo where the change can be reversed. */
export function KitchenNotice({ notice, onDismiss, raised = false }: { notice: KitchenNoticeValue | null; onDismiss: () => void; raised?: boolean }) {
  const failure = notice?.tone === 'error'
  return <div className={cn('pointer-events-none fixed inset-x-0 z-[var(--z-dialog)] flex justify-center px-4 print:hidden', raised ? 'bottom-[calc(7rem+env(safe-area-inset-bottom))] lg:bottom-6' : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))]')}>
    <div role="status" aria-live="polite" className="contents">
      {notice && <div className={cn('pointer-events-auto flex w-full max-w-[480px] items-center gap-4 rounded-field px-4 py-3 text-body-sm leading-snug shadow-raised', failure ? 'bg-danger text-white' : 'bg-ink text-on-dark-label')}>
        <p className="min-w-0 flex-1">{notice.message}</p>
        {notice.action && <Button variant="quiet-on-dark" className={failure ? 'text-white' : undefined} onClick={() => { notice.action!.run(); onDismiss() }}>{notice.action.label}</Button>}
        <Button variant="quiet-on-dark" size="icon-xs" aria-label="Dismiss" className={failure ? 'text-white' : undefined} onClick={onDismiss}><X className="size-4" /></Button>
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
          <Eyebrow as="h3" size="small" tone="muted" className="px-6 pt-4 pb-1.5">{group.day}</Eyebrow>
          <ol>
            {group.items.map(({ revision, index }) => {
              const previous = revisions[index + 1] ?? null
              const current = index === 0
              return <li key={revision.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-border px-6 py-3 first:border-t-0', current && 'bg-tint')}>
                <p className="text-body-sm leading-snug">{previous || !complete ? describe(revision, previous) : 'Created'}</p>
                {current
                  ? <span className="row-span-2 font-action text-xs font-bold">Current</span>
                  : <Button variant="link" className="row-span-2 text-caption" disabled={restoring !== null} aria-label={`Restore the version from ${dayLabel(revision.createdAt)} at ${clockLabel(revision.createdAt)}`} onClick={() => onRestore(revision)}>{restoring === revision.id ? 'Restoring…' : 'Restore'}</Button>}
                <p className="text-caption text-muted-foreground">{clockLabel(revision.createdAt)}</p>
              </li>
            })}
          </ol>
        </section>)}
      </div>
      <p className="shrink-0 border-t border-border px-6 py-4 text-caption leading-relaxed text-muted-foreground">Restoring adds a new version on top, so a restore can be undone too.</p>
    </DialogContent>
  </Dialog>
}

/**
 * Phones keep the dough totals in one bottom sheet with three resting
 * heights: the peek bar (total and Save), half, and nearly full. The sheet
 * follows a finger dragged on it in either direction (only on its header at
 * full height, where the list scrolls by touch) and settles on the nearest
 * height, or the next one in the direction of a flick; tapping
 * the summary toggles peek and half, and Escape or the dimmed page returns
 * to peek. It is a non-modal disclosure, so the page stays available to
 * assistive technology. The page reserves exactly the peek height
 * (--dough-dock-peek) so the footer ends right above it.
 */
type DockStop = 'peek' | 'half' | 'full'
const DOCK_STOPS: DockStop[] = ['peek', 'half', 'full']
export function DoughDock({ total, detail, changeCount = 0, children, action }: { total: string; detail: string; changeCount?: number; children: ReactNode; action: ReactNode }) {
  const headRef = useRef<HTMLDivElement>(null)
  const [peek, setPeek] = useState(112)
  const [viewport, setViewport] = useState(800)
  const [stop, setStop] = useState<DockStop>('peek')
  const [drag, setDrag] = useState<number | null>(null)
  // No slide until the real heights are measured, so the first paint doesn't animate.
  const [measured, setMeasured] = useState(false)
  const gesture = useRef<{ pointer: number; y: number; start: number; height: number; lastY: number; t: number; v: number; moved: boolean } | null>(null)
  const summaryRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const justDragged = useRef(false)
  const id = useId()
  useEffect(() => {
    const el = headRef.current
    if (!el) return
    const root = document.documentElement
    const update = () => {
      const height = Math.ceil(el.getBoundingClientRect().height)
      setPeek(height)
      setViewport(window.innerHeight)
      root.style.setProperty('--dough-dock-peek', `${height}px`)
    }
    update()
    const frame = requestAnimationFrame(() => setMeasured(true))
    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener('resize', update)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', update); root.style.removeProperty('--dough-dock-peek') }
  }, [])
  const heights: Record<DockStop, number> = { peek, half: Math.round(viewport * 0.6), full: Math.round(viewport * 0.94) }
  const shown = drag ?? heights[stop]
  const expanded = stop !== 'peek'
  const scrolls = stop === 'full'
  const settle = (height: number, velocity: number) => {
    // A flick (px/ms; positive is upward) moves one stop that way; otherwise the nearest stop wins.
    const order = DOCK_STOPS.map((name) => ({ name, height: heights[name] }))
    if (Math.abs(velocity) > 0.4) {
      const next = velocity > 0 ? order.find((s) => s.height > height + 8) ?? order[2] : [...order].reverse().find((s) => s.height < height - 8) ?? order[0]
      return next.name
    }
    return order.reduce((best, s) => Math.abs(s.height - height) < Math.abs(best.height - height) ? s : best).name
  }
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || gesture.current) return
    justDragged.current = false
    // At full height the list scrolls, so only the header drags the sheet.
    if (scrolls && panelRef.current?.contains(event.target as Node)) return
    gesture.current = { pointer: event.pointerId, y: event.clientY, start: heights[stop], height: heights[stop], lastY: event.clientY, t: event.timeStamp, v: 0, moved: false }
  }
  const onPointerMove = (event: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.pointer !== event.pointerId) return
    const dy = g.y - event.clientY
    if (!g.moved && Math.abs(dy) < 6) return
    if (!g.moved) { g.moved = true; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) }
    const dt = Math.max(1, event.timeStamp - g.t)
    g.v = (g.lastY - event.clientY) / dt
    g.lastY = event.clientY
    g.t = event.timeStamp
    g.height = Math.min(heights.full, Math.max(peek, g.start + dy))
    setDrag(g.height)
  }
  const onPointerUp = (event: React.PointerEvent) => {
    const g = gesture.current
    if (!g || g.pointer !== event.pointerId) return
    gesture.current = null
    if (!g.moved) return
    // Cleared by the next pointerdown, so the click that ends this drag can't toggle the sheet.
    justDragged.current = true
    // A finger that rested before lifting is not a flick.
    const velocity = event.timeStamp - g.t > 100 ? 0 : g.v
    setStop(settle(g.height, velocity))
    setDrag(null)
  }
  // The click that ends a drag must not also toggle the sheet.
  const swallowTapAfterDrag = (event: React.MouseEvent) => { if (justDragged.current) { event.preventDefault(); event.stopPropagation() } }
  useEffect(() => {
    if (!expanded) return
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setStop('peek') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])
  useEffect(() => {
    if (stop !== 'peek') return
    // Collapsing makes the list inert: keep focus on the sheet, and start the list at the top next time.
    const panel = panelRef.current
    if (panel?.contains(document.activeElement)) summaryRef.current?.focus()
    if (panel) panel.scrollTop = 0
  }, [stop])
  const animate = measured && drag === null
  const dim = Math.min(1, Math.max(0, (shown - peek) / Math.max(1, heights.half - peek)))
  return <>
    <div aria-hidden="true" onClick={() => setStop('peek')}
      className={cn('fixed inset-0 z-[var(--z-nav)] touch-none motion-reduce:!transition-none bg-ink/30 lg:hidden print:hidden', dim === 0 && 'pointer-events-none')}
      style={{ opacity: dim, transition: animate ? 'opacity 300ms ease' : undefined }} />
    <section
      aria-label="Your dough"
      data-dough-dock=""
      data-stop={stop}
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex motion-reduce:!transition-none flex-col overflow-hidden rounded-t-surface bg-ink text-on-dark-label shadow-overlay lg:hidden print:hidden"
      style={{ height: heights.full, transform: `translateY(${heights.full - shown}px)`, transition: animate ? 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)' : undefined }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClickCapture={swallowTapAfterDrag}
    >
      <div ref={headRef}
        className="shrink-0 cursor-grab touch-none px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] select-none active:cursor-grabbing">
        <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-plum-400" />
        <div className="flex items-center gap-3">
          <button ref={summaryRef} type="button" aria-expanded={expanded} aria-controls={`${id}-panel`} onClick={() => setStop(expanded ? 'peek' : 'half')}
            className="grid min-h-11 min-w-0 flex-1 justify-items-start rounded-field text-left focus-visible:outline-2 focus-visible:outline-on-dark-label focus-visible:outline-offset-2">
            <span className="flex items-center gap-1.5 font-action text-xs font-bold uppercase tracking-eyebrow text-brand">Your dough {expanded ? <ChevronDown aria-hidden="true" className="size-3.5" /> : <ChevronUp aria-hidden="true" className="size-3.5" />}</span>
            <span className="flex min-w-0 items-baseline gap-2"><strong className="font-action text-2xl font-bold tabular-nums text-brand">{total}</strong><span className="truncate text-caption">{detail}{changeCount > 0 && ` · ${changeCount} ${changeCount === 1 ? 'change' : 'changes'}`}</span></span>
          </button>
          {action}
        </div>
      </div>
      <div ref={panelRef} id={`${id}-panel`} inert={!expanded} className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]', !scrolls && 'touch-none')}>{children}</div>
    </section>
  </>
}
