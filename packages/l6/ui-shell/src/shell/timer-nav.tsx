'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Timer, X } from 'lucide-react'
import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { clearFinishedKitchenTimers, removeKitchenTimer, takeFinishedKitchenTimers, timerClock, useKitchenTimers, type KitchenTimer } from '@eat-yeet/l5-ui-primitives/primitives/kitchen-timers'
import { cn } from '@eat-yeet/l0-foundation/utils'

/** Rings for up to a minute after a timer finishes, or until it is dismissed or the popover opens. */
const RING_MS = 60_000
const RING_EVERY_MS = 2_000

let audio: AudioContext | null = null
/** Browsers start sound only after a gesture: create/resume the context on one. */
export function primeTimerAlarm() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch { /* no Web Audio */ }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission().catch(() => {})
}

/** A bright three-note kitchen chime. */
function chime() {
  if (!audio || audio.state !== 'running') return
  const start = audio.currentTime
  ;[880, 1175, 1568].forEach((frequency, index) => {
    const at = start + index * 0.16
    const osc = audio!.createOscillator(), gain = audio!.createGain()
    osc.type = 'triangle'; osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5)
    osc.connect(gain).connect(audio!.destination)
    osc.start(at); osc.stop(at + 0.55)
  })
}

function notify(timer: KitchenTimer) {
  try { navigator.vibrate?.([300, 120, 300, 120, 300]) } catch { /* unsupported */ }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try { new Notification('Timer done', { body: timer.recipe ? `${timer.recipe.title}: ${timer.label}` : timer.label, tag: `eatyeet-timer-${timer.id}` }) } catch { /* mobile Safari outside a Home Screen app */ }
}

/**
 * App-bar timers: hidden until a timer exists, then a clock button showing the
 * next one counting down (pink and pulsing when one is done), opening a white
 * panel listing each timer with its recipe, time left and Cancel/Dismiss.
 * This is the only place timers ring: a chime every two seconds for a minute,
 * a vibration and a notification where allowed. Opening the panel silences it.
 */
export function TimerNav({ tone = 'page' }: { tone?: 'page' | 'hero' }) {
  const timers = useKitchenTimers()
  const [now, setNow] = useState(() => Date.now())
  const [open, setOpen] = useState(false)
  const [ringingUntil, setRingingUntil] = useState(0)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  // Tick while anything runs or rings; ring timers that finished, including while the page was closed.
  useEffect(() => {
    if (!timers.length) return
    const tick = () => {
      const at = Date.now()
      setNow(at)
      const due = takeFinishedKitchenTimers(at)
      if (due.length) { due.forEach(notify); setRingingUntil(at + RING_MS) }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timers.length])

  useEffect(() => {
    if (!ringingUntil) return
    chime()
    const id = setInterval(() => { if (Date.now() > ringingUntil) setRingingUntil(0); else chime() }, RING_EVERY_MS)
    return () => clearInterval(id)
  }, [ringingUntil])

  // A gesture anywhere re-arms sound after a reload (browsers block it until then).
  useEffect(() => {
    if (!timers.length) return
    const arm = () => { try { if (audio?.state === 'suspended') void audio.resume(); else if (!audio) audio = new AudioContext() } catch { /* none */ } }
    document.addEventListener('pointerdown', arm, { once: true })
    return () => document.removeEventListener('pointerdown', arm)
  }, [timers.length])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return
        setOpen(false); trigger.current?.focus()
      } else if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  useEffect(() => { if (!timers.length) setOpen(false) }, [timers.length])

  if (!timers.length) return null
  const done = timers.filter((timer) => timer.endsAt <= now)
  const next = timers.find((timer) => timer.endsAt > now)
  const summary = done.length ? `${done.length} done` : next ? timerClock(next.endsAt - now) : ''
  const hero = tone === 'hero' && !done.length
  return <div ref={root} className="relative">
    <Button ref={trigger} variant="ghost" aria-expanded={open} aria-controls={panelId}
      aria-label={`Timers: ${timers.length} ${timers.length === 1 ? 'timer' : 'timers'}${done.length ? `, ${done.length} done` : next ? `, next in ${timerClock(next.endsAt - now)}` : ''}`}
      className={cn('min-h-11 gap-1.5 rounded-control px-3 font-action text-sm font-bold tabular-nums',
        done.length ? 'bg-brand text-ink hover:bg-brand-soft motion-safe:animate-pulse' : hero ? 'text-white hover:bg-white/10' : 'text-ink')}
      onClick={() => { primeTimerAlarm(); setRingingUntil(0); setOpen((current) => !current) }}>
      <Timer aria-hidden="true" className="size-5" />
      <span aria-hidden="true">{summary}</span>
    </Button>
    <div id={panelId} hidden={!open} role="region" aria-label="Timers"
      className="absolute right-0 top-full z-[var(--z-nav)] mt-2 w-72 rounded-surface bg-white p-4 text-ink shadow-overlay">
      <p className="font-action text-xs font-bold uppercase tracking-eyebrow text-muted-foreground">Timers</p>
      <ul className="m-0 mt-1 grid list-none p-0" aria-live="polite">
        {timers.map((timer) => {
          const finished = timer.endsAt <= now
          return <li key={timer.id} data-timer-done={finished || undefined} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-action text-sm font-bold">{timer.label}</span>
              {timer.recipe && <Link to={timer.recipe.href} onClick={() => setOpen(false)} className="truncate text-xs text-muted-foreground underline underline-offset-2">{timer.recipe.title}</Link>}
            </span>
            <span className={cn('font-action text-base font-bold tabular-nums', finished && 'rounded-control bg-brand px-2 text-ink')}>{finished ? 'Done' : timerClock(timer.endsAt - now)}</span>
            <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={finished ? `Dismiss ${timer.label}` : `Cancel ${timer.label}`}
              onClick={() => removeKitchenTimer(timer.id)}><X aria-hidden="true" className="size-4" /></Button>
          </li>
        })}
      </ul>
      {done.length > 1 && <Button variant="link" className="mt-2" onClick={() => clearFinishedKitchenTimers(now)}>Clear finished</Button>}
    </div>
  </div>
}
