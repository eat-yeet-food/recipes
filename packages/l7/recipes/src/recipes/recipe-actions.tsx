import type { ReactNode } from 'react'

import { cn } from '@eat-yeet/l0-foundation/utils'

const ACTION_BASE =
  'border-0 !shadow-none cursor-pointer uppercase font-[family-name:var(--font-action)] text-[13px] font-bold tracking-[1.95px] outline-none focus-visible:ring-3 focus-visible:ring-[var(--yeet-tomato)]/25'

const ACTION_VARIANTS = {
  hero:
    'inline-flex items-center justify-center gap-1.5 min-h-8 px-2.5 py-1.5 !bg-[var(--yeet-pink)] !text-[var(--yeet-gray)] leading-[20.8px] visited:!text-[var(--yeet-gray)] hover:!bg-[var(--yeet-gray)] hover:!text-white active:!bg-[var(--yeet-gray)] active:!text-white focus-visible:!bg-[var(--yeet-pink)] focus-visible:!text-[var(--yeet-gray)] max-[640px]:flex-[1_1_calc(50%-4px)]',
  card:
    'inline-flex items-center justify-center gap-2 min-h-[42px] px-3.5 py-2.5 !bg-[var(--yeet-tomato)] !text-white leading-[1.25] visited:!text-white hover:!bg-[var(--yeet-gray)] hover:!text-white active:!bg-[var(--yeet-gray)] active:!text-white focus-visible:!bg-[var(--yeet-tomato)] focus-visible:!text-white',
}

type RecipeActionProps = {
  variant: keyof typeof ACTION_VARIANTS
  href?: string
  target?: string
  rel?: string
  onClick?: () => void
  children: ReactNode
}

export function RecipeAction({
  variant,
  href,
  target,
  rel,
  onClick,
  children,
}: RecipeActionProps) {
  const className = cn(ACTION_BASE, ACTION_VARIANTS[variant])

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={className}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  )
}

export function CookModeSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onCheckedChange}
      className="inline-flex min-h-[42px] cursor-pointer items-center justify-between gap-3 border border-[var(--yeet-border)] bg-[var(--yeet-light-pink)] px-3.5 py-2.5 font-[family-name:var(--font-action)] text-[13px] font-bold uppercase tracking-[1.95px] text-[var(--yeet-gray)] outline-none hover:border-[var(--yeet-gray)] focus-visible:ring-3 focus-visible:ring-[var(--yeet-tomato)]/25"
    >
      <span>Cook Mode</span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${checked ? 'bg-[var(--yeet-tomato-strong)]' : 'bg-[var(--yeet-gray)]'}`}
      >
        <span className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}
