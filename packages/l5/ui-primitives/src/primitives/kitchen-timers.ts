'use client'
import { useSyncExternalStore } from 'react'

/**
 * Kitchen timers that outlive the page: each is stored with its end time in
 * localStorage (`eatyeet:timers`), so a reload, a closed tab or another tab
 * picks it back up. The app bar's TimerNav is the one place that rings them;
 * cook mode only starts and lists them.
 */
export type KitchenTimer = {
  id: string
  /** What is timing, e.g. "Simmer · 20 min". */
  label: string
  /** The recipe it belongs to, linked from the app bar. */
  recipe?: { title: string; href: string }
  endsAt: number
  /** Set once it has rung, so other tabs and reloads never ring it again. */
  rang?: boolean
}

const KEY = 'eatyeet:timers'
const EVENT = 'eatyeet:timers'
const EMPTY: KitchenTimer[] = []
let cache: { raw: string | null; timers: KitchenTimer[] } = { raw: null, timers: EMPTY }

const valid = (value: unknown): value is KitchenTimer => {
  const t = value as KitchenTimer
  return Boolean(t) && typeof t.id === 'string' && typeof t.label === 'string' && Number.isFinite(t.endsAt)
}

function read(): KitchenTimer[] {
  if (typeof window === 'undefined') return EMPTY
  let raw: string | null = null
  try { raw = window.localStorage.getItem(KEY) } catch { return EMPTY }
  if (raw === cache.raw) return cache.timers
  let timers = EMPTY
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    timers = Array.isArray(parsed) ? parsed.filter(valid).slice(0, 20) : EMPTY
  } catch { /* corrupt: start empty */ }
  cache = { raw, timers }
  return timers
}

function write(timers: KitchenTimer[]) {
  try {
    if (timers.length) window.localStorage.setItem(KEY, JSON.stringify(timers))
    else window.localStorage.removeItem(KEY)
  } catch { /* private mode or full: timers last for this page only */ }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) onChange() }
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener('storage', onStorage) }
}

/** The stored timers, soonest first; empty during server rendering and hydration. */
export function useKitchenTimers(): KitchenTimer[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export function startKitchenTimer(timer: { label: string; minutes: number; recipe?: KitchenTimer['recipe'] }) {
  const now = Date.now()
  const next: KitchenTimer = { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, label: timer.label, endsAt: now + timer.minutes * 60_000, ...(timer.recipe ? { recipe: timer.recipe } : {}) }
  write([...read(), next].sort((a, b) => a.endsAt - b.endsAt))
  return next
}

export function removeKitchenTimer(id: string) { write(read().filter((timer) => timer.id !== id)) }
export function clearFinishedKitchenTimers(now = Date.now()) { write(read().filter((timer) => timer.endsAt > now)) }

/**
 * Marks every finished, unrung timer as rung and returns them. Reads storage
 * afresh, so of several open tabs normally only the first to tick rings.
 */
export function takeFinishedKitchenTimers(now = Date.now()): KitchenTimer[] {
  const timers = read()
  const due = timers.filter((timer) => !timer.rang && timer.endsAt <= now)
  if (due.length) write(timers.map((timer) => due.includes(timer) ? { ...timer, rang: true } : timer))
  return due
}

/** m:ss, or h:mm:ss for an hour or more. */
export function timerClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}
