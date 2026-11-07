'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'

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

/** Recipe header action: a 44px plum circle; pink with a plum icon when pressed. */
export function RecipeIconAction({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return <Button
    size="icon"
    aria-label={label}
    title={label}
    aria-pressed={pressed}
    data-recipe-action={label}
    onClick={onClick}
    className="[&_svg]:size-5 aria-pressed:bg-brand aria-pressed:text-ink aria-pressed:hover:bg-brand-soft"
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
  useEffect(() => {
    try { setOpen(!localStorage.getItem(COOKING_VIEW_HINT_KEY)) } catch { /* storage blocked: never show */ }
  }, [])
  useEffect(() => { if (used) dismiss() }, [used])
  function dismiss() {
    setOpen(false)
    try { localStorage.setItem(COOKING_VIEW_HINT_KEY, '1') } catch { /* ignore */ }
  }
  if (!open) return null
  return <div
    role="note"
    data-cooking-view-hint=""
    className="absolute right-0 top-full z-20 mt-3 w-64 rounded-surface bg-ink p-4 pr-10 text-left text-body-sm leading-snug text-white shadow-overlay before:absolute before:-top-2 before:right-4 before:size-4 before:rotate-45 before:bg-ink"
  >
    <p className="m-0 font-action font-bold">Cooking view</p>
    <p className="m-0 mt-1">Keeps your screen awake and trims the page to the recipe while you cook.</p>
    <Button variant="link" className="mt-2 text-on-dark-label" onClick={dismiss}>Got it</Button>
    <button type="button" aria-label="Dismiss hint" onClick={dismiss} className="absolute right-1 top-1 flex size-11 items-center justify-center text-on-dark-label hover:text-white"><X className="size-4" /></button>
  </div>
}
