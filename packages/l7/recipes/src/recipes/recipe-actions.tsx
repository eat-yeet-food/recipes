'use client'
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { X } from 'lucide-react'

import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { COOK_MODE_QUERY } from './cook-mode'

type RecipeActionProps = {
  variant: 'hero' | 'card'
  href?: string
  target?: string
  rel?: string
  onClick?: () => void
  pressed?: boolean
  children: ReactNode
}

export function RecipeAction({
  variant,
  href,
  target,
  rel,
  onClick,
  pressed,
  children,
}: RecipeActionProps) {
  const buttonVariant = pressed !== undefined && variant !== 'hero' ? 'toggle' : 'default'
  const size = variant === 'hero' ? 'sm' : 'default'
  const className = variant === 'hero' ? 'w-40 max-w-full aria-pressed:bg-brand aria-pressed:text-ink aria-pressed:hover:bg-brand-soft' : undefined
  if (href) return <Button asChild variant={buttonVariant} size={size} className={className}><a href={href} target={target} rel={rel}>{children}</a></Button>
  return <Button
    variant={buttonVariant}
    size={size}
    className={className}
    onClick={onClick}
    aria-pressed={pressed}
  >{children}</Button>
}

/**
 * Page header action: a 44px plum circle; pink with a plum icon when pressed
 * or when it is the page's finishing step (`tone="done"`); translucent white
 * on a plum band (`tone="on-dark"`). Links when given
 * an href.
 */
export function RecipeIconAction({ label, onClick, href, pressed, disabled, tone, children }: {
  label: string
  onClick?: (event: MouseEvent<HTMLElement>) => void
  href?: string
  pressed?: boolean
  disabled?: boolean
  tone?: 'done' | 'on-dark'
  children: ReactNode
}) {
  const className = cn('[&_svg]:size-5 aria-pressed:bg-brand aria-pressed:text-ink aria-pressed:hover:bg-brand-soft', tone === 'done' && 'bg-brand text-ink hover:bg-brand-soft', tone === 'on-dark' && 'bg-white/15 text-white hover:bg-white/25')
  if (href) return <Button asChild size="icon" className={className}>
    <a href={href} aria-label={label} title={label} data-recipe-action={label} onClick={onClick}>{children}</a>
  </Button>
  return <Button
    size="icon"
    aria-label={label}
    title={label}
    aria-pressed={pressed}
    disabled={disabled}
    data-recipe-action={label}
    onClick={onClick}
    className={className}
  >{children}</Button>
}

export const COOKING_VIEW_HINT_KEY = 'eatyeet:hint:cooking-view'

/**
 * First-visit hint for the Cooking view icon: phones have no hover, so the
 * icon explains itself once. Shown after hydration only; closing it, or
 * using Cooking view, retires it in this browser.
 */
export function CookingViewHint({ used }: { used: boolean }) {
  const [open, setOpen] = useState(false)
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    let unseen = false
    try { unseen = !localStorage.getItem(COOKING_VIEW_HINT_KEY) } catch { /* storage blocked: never show */ }
    if (!unseen) return
    setTouch(Boolean(window.matchMedia?.(COOK_MODE_QUERY).matches))
    // Wait until the page has loaded and settled so the hint never competes
    // with the hero image for first paint (it cost ~400ms of mobile LCP).
    let timer: ReturnType<typeof setTimeout> | undefined
    // Re-check on firing: using Cooking view during the wait retires the hint.
    const stillUnseen = () => { try { return !localStorage.getItem(COOKING_VIEW_HINT_KEY) } catch { return false } }
    const show = () => { timer = setTimeout(() => { if (stillUnseen()) setOpen(true) }, 1200) }
    if (document.readyState === 'complete') show()
    else window.addEventListener('load', show, { once: true })
    return () => { window.removeEventListener('load', show); if (timer) clearTimeout(timer) }
  }, [])
  useEffect(() => { if (used) dismiss() }, [used])
  function dismiss() {
    setOpen(false)
    try { localStorage.setItem(COOKING_VIEW_HINT_KEY, '1') } catch { /* ignore */ }
  }
  if (!open) return null
  // Floating hints are always a white card with a pointer, so they read as
  // floating on plum, white or photos alike; a ring marks the button they explain.
  return <>
    <span aria-hidden="true" data-cooking-view-hint-ring="" className="pointer-events-none absolute right-0 top-0 size-11 rounded-full ring-[3px] ring-brand ring-offset-[3px] ring-offset-ink" />
    <div
      role="note"
      data-cooking-view-hint=""
      className="absolute right-0 top-full z-20 mt-4 w-72 max-w-[calc(100vw-36px)] rounded-surface bg-white p-6 text-left text-body-sm leading-snug text-ink shadow-overlay before:absolute before:-top-1.5 before:right-4 before:size-3.5 before:rotate-45 before:rounded-[2px] before:bg-white"
    >
      <p className="m-0 pr-7 font-action text-base font-bold">{touch ? 'Cook mode' : 'Cooking view'}</p>
      <p className="m-0 mt-1.5">{touch ? 'Check off your ingredients, then cook one step at a time. Keeps your screen awake.' : 'Keeps your screen awake and trims the page to the recipe while you cook.'}</p>
      <Button variant="link" className="mt-3.5" onClick={dismiss}>Got it</Button>
      <button type="button" aria-label="Dismiss hint" onClick={dismiss} className="absolute right-2.5 top-2.5 flex size-11 items-center justify-center text-muted-foreground hover:text-ink control-focus"><X className="size-4" /></button>
    </div>
  </>
}
