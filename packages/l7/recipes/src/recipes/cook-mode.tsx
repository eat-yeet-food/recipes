'use client'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Timer, X } from 'lucide-react'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import { stepNeeds, type Need } from './step-needs'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { haptic } from '@eat-yeet/l5-ui-primitives/primitives/haptics'
import { Eyebrow } from '@eat-yeet/l5-ui-primitives/primitives/typography'

/** Touch devices (phones and tablets) get full-screen cook mode; mouse devices keep the focused page. */
export const COOK_MODE_QUERY = '(pointer: coarse)'

/** Wait after the last check before a finished group folds, so a mistaken tap can be undone. */
export const FOLD_DELAY_MS = 1000

/** Set when someone opts out of step-by-step cook mode for the classic Cooking view on this device. */
export const COOK_MODE_CLASSIC_KEY = 'eatyeet:cook-mode:classic'

type Step = { id: string; html: string; section: string; needs: Need[] }
type CookTimer = { id: string; label: string; endsAt: number; done: boolean }

const Html = ({ html, className }: { html: string; className?: string }) => <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')

const DURATION = /(\d+(?:\.\d+)?)(?:\s*(?:–|-|to)\s*(\d+(?:\.\d+)?))?\s*(minutes?|mins?|hours?|hrs?)\b/gi
/** Times written in a step ("bake 13–15 minutes") become timers set to the shorter end of the range. */
export function stepTimers(html: string): { label: string; minutes: number }[] {
  const seen = new Set<string>()
  return [...plain(html).matchAll(DURATION)].flatMap((match) => {
    const hours = /^h/i.test(match[3])
    const minutes = Number(match[1]) * (hours ? 60 : 1)
    const label = `${match[1]}${match[2] ? `–${match[2]}` : ''} ${hours ? 'hr' : 'min'}`
    if (!minutes || seen.has(label)) return []
    seen.add(label)
    return [{ label, minutes }]
  })
}

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Full-screen cook mode for phones and tablets: an intro explains the two
 * stages, then gather ingredients on a
 * checklist whose finished groups fold away (tap a folded group to reopen it),
 * then cook one step at a time with tap-to-start timers. Exit keeps your
 * place for this visit; finishing (Back to recipe) resets it. The page keeps the screen awake meanwhile.
 */
export function CookMode({ title, blocks, open, onClose, onFinish, onClassic, media, facts }: { title: string; blocks: RecipeBlock[]; open: boolean; media?: ReactNode; facts?: string; onClose: () => void; onFinish?: () => void; onClassic?: () => void }) {
  const groups = useMemo(() => blocks.flatMap((block) => block.ingredients).filter((section) => section.items.length > 0), [blocks])
  const steps = useMemo<Step[]>(() => blocks.flatMap((block) => block.steps.flatMap((section) => section.items.map((html, index) => ({ id: `${section.id}:${section.itemIds[index] ?? index}`, html, section: section.title, needs: stepNeeds(section.itemUses?.[index] ?? [], block.ingredients) })))), [blocks])
  const [stage, setStage] = useState<'intro' | 'gather' | 'cook' | 'done'>('intro')
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [folded, setFolded] = useState<Set<string>>(() => new Set())
  const [stepIndex, setStepIndex] = useState(0)
  const [timers, setTimers] = useState<CookTimer[]>([])
  const [now, setNow] = useState(() => Date.now())
  const dialog = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const foldTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const itemKey = (section: Section, index: number) => `${section.id}:${section.itemIds[index] ?? index}`
  const total = groups.reduce((sum, section) => sum + section.items.length, 0)
  const complete = (section: Section, set = checked) => section.items.every((_, index) => set.has(itemKey(section, index)))

  // Lock page scroll and move focus into the dialog while open.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => { document.documentElement.style.overflow = overflow; previous?.focus?.() }
  }, [open])

  // Timers tick once a second; finished ones buzz once and pulse until dismissed.
  useEffect(() => {
    if (!timers.some((timer) => !timer.done)) return
    const tick = setInterval(() => {
      const at = Date.now()
      setNow(at)
      setTimers((current) => current.map((timer) => {
        if (timer.done || timer.endsAt > at) return timer
        try { navigator.vibrate?.([200, 100, 200]) } catch { /* unsupported */ }
        return { ...timer, done: true }
      }))
    }, 1000)
    return () => clearInterval(tick)
  }, [timers])

  useEffect(() => () => { foldTimers.current.forEach(clearTimeout) }, [])

  const next = useCallback(() => {
    if (stage !== 'cook') return
    haptic()
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1)
    else setStage('done')
  }, [stage, stepIndex, steps.length])
  const previous = useCallback(() => {
    if (stage === 'done') { setStage('cook'); return }
    if (stage !== 'cook') return
    if (stepIndex > 0) { haptic(); setStepIndex(stepIndex - 1) } else if (groups.length) setStage('gather')
  }, [stage, stepIndex, groups.length])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight') next()
      else if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, next, previous])

  function toggleItem(section: Section, index: number) {
    haptic()
    const key = itemKey(section, index)
    const set = new Set(checked)
    if (set.has(key)) set.delete(key); else set.add(key)
    setChecked(set)
    const pending = foldTimers.current.get(section.id)
    if (pending) { clearTimeout(pending); foldTimers.current.delete(section.id) }
    if (complete(section, set)) {
      foldTimers.current.set(section.id, setTimeout(() => {
        foldTimers.current.delete(section.id)
        setFolded((current) => new Set(current).add(section.id))
        list.current?.scrollTo?.({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })
      }, FOLD_DELAY_MS))
      return
    }
    // Keep the next unchecked item comfortably in view.
    const nextIndex = section.items.findIndex((_, i) => !set.has(itemKey(section, i)))
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-cook-item="${CSS.escape(itemKey(section, nextIndex))}"]`)
      ?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }))
  }

  function toggleGroup(section: Section) {
    const set = new Set(folded)
    if (set.has(section.id)) set.delete(section.id); else set.add(section.id)
    setFolded(set)
  }

  function startTimer(label: string, minutes: number) {
    haptic()
    const at = Date.now()
    setNow(at)
    setTimers((current) => [...current, { id: `${at}`, label, endsAt: at + minutes * 60_000, done: false }])
  }

  // Swipe left/right between steps; a tap on the right or left edge does the same.
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (event: ReactPointerEvent) => { swipe.current = { x: event.clientX, y: event.clientY } }
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = swipe.current
    swipe.current = null
    if (!start || (event.target as HTMLElement).closest('button, a')) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else previous(); return }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const { left, width } = event.currentTarget.getBoundingClientRect()
      const x = (event.clientX - left) / width
      if (x > 0.6) next(); else if (x < 0.25) previous()
    }
  }

  const checkedCount = checked.size
  const allFolded = groups.length > 0 && groups.every((section) => folded.has(section.id))
  const step = steps[stepIndex]
  const sectionTitle = step?.section
  const finished = stage === 'done'

  return <div ref={dialog} role="dialog" aria-modal="true" aria-label={`Cook mode: ${title}`} tabIndex={-1} hidden={!open} data-cook-stage={stage}
    className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white text-ink outline-none print:hidden">
    <header className="flex items-center justify-between gap-4 px-5 pt-[max(env(safe-area-inset-top),16px)] md:px-10">
      <Eyebrow as="p" tone="ink" className="m-0 min-w-0 truncate">
        {stage === 'gather' ? <>Gather · <span className="tabular-nums" aria-live="polite">{checkedCount} of {total}</span></> : stage === 'cook' ? `Step ${stepIndex + 1} of ${steps.length}` : stage === 'done' ? 'Done' : ''}
      </Eyebrow>
      <Button variant="ghost" size="icon" aria-label="Exit cook mode" title="Exit cook mode" onClick={onClose}><X /></Button>
    </header>
    {stage !== 'intro' && <div className="mx-5 mt-2 flex gap-1.5 md:mx-10" aria-hidden="true">
      {stage === 'gather'
        ? <div className="h-1 flex-1 overflow-hidden rounded-control bg-muted"><div className="h-full rounded-control bg-brand transition-[width] duration-300" style={{ width: `${total ? (checkedCount / total) * 100 : 0}%` }} /></div>
        : steps.map((s, index) => <div key={s.id} className={cn('h-1 flex-1 rounded-control transition-colors', finished || index <= stepIndex ? 'bg-brand' : 'bg-muted')} />)}
    </div>}

    {stage === 'intro' && <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)] md:mx-auto md:w-full md:max-w-2xl md:px-10 landscape:md:max-w-none landscape:md:flex-row landscape:md:items-center landscape:md:gap-12">
      {media && <div className="mb-6 shrink-0 overflow-hidden rounded-surface [&_img]:h-60 [&_img]:w-full [&_img]:object-cover md:[&_img]:h-80 landscape:md:mb-0 landscape:md:w-[45%]">{media}</div>}
      <div className="flex flex-1 flex-col landscape:md:justify-center">
        <Eyebrow as="p" tone="muted" className="m-0">{title} · Cook mode</Eyebrow>
        <h2 className="mt-2 mb-6 font-display text-display leading-none">Let’s get cooking</h2>
        <ol className="m-0 grid list-none gap-4 p-0">
          {[groups.length > 0 && ['Gather', 'Lay out and measure every ingredient, checking each one off.'], ['Cook', 'Follow one step at a time, with timers when you need them.']].filter(Boolean).map((item, index) => {
            const [name, text] = item as string[]
            return <li key={name} className="flex gap-4"><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft font-bold">{index + 1}</span><span><strong className="block text-lg">{name}</strong><span className="text-muted-foreground">{text}</span></span></li>
          })}
        </ol>
        <p className="mt-auto border-t border-border pt-4 text-body-sm text-muted-foreground landscape:md:mt-8">{[`${total} ingredients`, `${steps.length} steps`, facts].filter(Boolean).join(' · ')}</p>
        <Button size="lg" className="mt-4 w-full" onClick={() => { haptic(); setStage(groups.length ? 'gather' : 'cook') }}>{groups.length ? 'Gather ingredients' : 'Start cooking'}<ArrowRight /></Button>
        {onClassic && <Button variant="link" size="xs" className="mx-auto mt-4" onClick={onClassic}>Classic view</Button>}
      </div>
    </div>}

    {stage === 'gather' && <>
      <div ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-6 md:px-10">
        <h2 className="m-0 font-display text-title leading-none">Gather your ingredients</h2>
        <p className="mt-2 mb-6 text-muted-foreground">Measure everything out before you start. Check each item as it’s ready.</p>
        <div className="grid items-start gap-x-14 gap-y-4 md:grid-cols-2">
          {groups.map((section) => {
            const isFolded = folded.has(section.id)
            const done = complete(section)
            const label = section.title || 'Ingredients'
            return <section key={section.id} data-cook-group={section.id}>
              <button type="button" onClick={() => toggleGroup(section)} aria-expanded={!isFolded} data-folded={isFolded ? 'true' : undefined}
                className={cn('flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink', isFolded && 'rounded-field bg-brand-soft px-4')}>
                <Eyebrow as="span" tone="ink">{label}</Eyebrow>
                <span className="flex items-center gap-2 text-caption font-semibold tabular-nums">
                  {done && <span><Check className="mr-1 inline size-4" aria-hidden="true" />{section.items.length} of {section.items.length}</span>}
                  <ChevronDown aria-hidden="true" className={cn('size-5 transition-transform', !isFolded && 'rotate-180')} />
                </span>
              </button>
              {!isFolded && <ul className="m-0 list-none p-0">
                {section.items.map((item, index) => {
                  const key = itemKey(section, index)
                  const on = checked.has(key)
                  return <li key={key} className="border-b border-border">
                    <button type="button" role="checkbox" aria-checked={on} data-cook-item={key} onClick={() => toggleItem(section, index)}
                      className="flex min-h-12 w-full items-center gap-4 py-2.5 text-left text-base md:text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                      <span aria-hidden="true" className={cn('grid size-7 shrink-0 place-items-center rounded-filter border-2 transition-colors', on ? 'border-brand bg-brand' : 'border-ink')}>
                        {on && <Check className="size-4" strokeWidth={3.5} />}
                      </span>
                      <Html html={item} className={cn('min-w-0 transition-opacity [&_strong]:font-bold', on && 'text-muted-foreground line-through decoration-ink')} />
                    </button>
                  </li>
                })}
              </ul>}
            </section>
          })}
        </div>
        {allFolded && <p className="mt-6 text-lg font-semibold">Everything’s ready.</p>}
      </div>
      <footer className="flex flex-col items-stretch gap-4 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] md:items-end md:px-10">
        <Button size="lg" className="w-full md:w-auto" onClick={() => { haptic(); setStage('cook') }}>Start cooking<ArrowRight /></Button>
        {onClassic && <Button variant="link" size="xs" className="self-center md:self-end" onClick={onClassic}>Classic view</Button>}
      </footer>
    </>}

    {stage === 'cook' && step && <>
      <div className="flex min-h-0 flex-1 gap-10 px-5 pt-6 md:px-10 landscape:md:pt-8" onPointerDown={onPointerDown} onPointerUp={onPointerUp} data-cook-step={step.id}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {sectionTitle && <Eyebrow as="p" tone="muted" className="mb-2.5">{sectionTitle}</Eyebrow>}
          <Html html={step.html} className="block text-title-sm leading-snug font-semibold md:text-section [&_strong]:font-bold" />
          {step.needs.length > 0 && <section aria-label="You’ll need" data-cook-needs="" className="mt-6 rounded-surface bg-muted px-5 py-4">
            <Eyebrow as="h2" tone="muted" className="mb-1">You’ll need</Eyebrow>
            <ul className="m-0 list-none p-0">{step.needs.map((need) => <li key={need.key} className="border-t border-border py-2 text-base first:border-0 md:text-lg">
              {need.amount && <strong className="font-bold">{need.amount} </strong>}<Html html={need.name} />
            </li>)}</ul>
          </section>}
          {stepTimers(step.html).length > 0 && <div className="mt-6 flex flex-wrap gap-3">
            {stepTimers(step.html).map((timer) => <Button key={timer.label} variant="utility" onClick={() => startTimer(timer.label, timer.minutes)}><Timer />Start {timer.label} timer</Button>)}
          </div>}
        </div>
        {groups.length > 0 && <aside aria-label="Ingredients" className="hidden min-h-0 w-[34%] shrink-0 overflow-y-auto rounded-surface bg-muted p-6 landscape:md:block">
          {groups.map((section) => <section key={section.id} className="[&+section]:mt-5">
            <Eyebrow as="h2" tone="ink" className="mb-1">{section.title || 'Ingredients'}</Eyebrow>
            <ul className="m-0 list-none p-0">{section.items.map((item, index) => { const used = step.needs.some((need) => need.key === section.itemIds[index]); return <li key={index} data-used={used ? 'true' : undefined} className={cn('border-b border-border py-2 text-body-sm', used && '-mx-2 rounded-filter border-transparent bg-brand-soft px-2 font-semibold')}><Html html={item} className="[&_strong]:font-bold" /></li> })}</ul>
          </section>)}
        </aside>}
      </div>
      <footer className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] md:px-10">
        {timers.length > 0 && <ul aria-label="Timers" aria-live="polite" className="m-0 mb-3 flex list-none flex-wrap gap-2 p-0">
          {timers.map((timer) => <li key={timer.id}>
            <Button variant={timer.done ? 'on-dark' : 'default'} size="sm" className={cn('tabular-nums', timer.done && 'motion-safe:animate-pulse')}
              aria-label={timer.done ? `${timer.label} timer done, dismiss` : `${timer.label} timer, ${clock(timer.endsAt - now)} left, cancel`}
              onClick={() => setTimers((current) => current.filter((t) => t.id !== timer.id))}>
              <Timer />{timer.label}<span>{timer.done ? 'Done!' : clock(timer.endsAt - now)}</span><X />
            </Button>
          </li>)}
        </ul>}
        <div className="flex items-center justify-between gap-3">
          <Button variant="utility" size="lg" onClick={previous} aria-label={stepIndex === 0 && groups.length ? 'Back to ingredients' : 'Previous step'}><ArrowLeft />Back</Button>
          <Button size="lg" onClick={next}>{stepIndex === steps.length - 1 ? 'Finish' : 'Next'}<ArrowRight /></Button>
        </div>
      </footer>
    </>}

    {stage === 'done' && <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 text-center">
      <p className="m-0 font-display text-display leading-none">That’s a wrap.</p>
      <p className="m-0 text-lg">Enjoy your {title}.</p>
      <div className="flex gap-3">
        <Button variant="utility" size="lg" onClick={previous}><ArrowLeft />Back</Button>
        <Button size="lg" onClick={onFinish ?? onClose}>Back to recipe</Button>
      </div>
    </div>}
  </div>
}
