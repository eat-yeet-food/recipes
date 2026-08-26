import type { ReactNode } from 'react'

import { cn } from '@eat-yeet/l0-foundation/utils'

const ACTION_BASE =
  'border-0 !shadow-none cursor-pointer uppercase font-[family-name:var(--font-action)] text-[13px] font-bold tracking-[1.95px] outline-none focus-visible:ring-3 focus-visible:ring-[var(--yeet-tomato)]/25'

const ACTION_VARIANTS = {
  hero:
    'inline-flex items-center justify-center gap-1.5 min-h-8 px-2.5 py-1.5 !bg-[var(--yeet-pink)] !text-[var(--yeet-gray)] leading-[20.8px] visited:!text-[var(--yeet-gray)] hover:!bg-[var(--yeet-gray)] hover:!text-white active:!bg-[var(--yeet-gray)] active:!text-white focus-visible:!bg-[var(--yeet-pink)] focus-visible:!text-[var(--yeet-gray)] aria-pressed:!bg-[var(--yeet-gray)] aria-pressed:!text-white max-[640px]:flex-[1_1_calc(50%-4px)]',
  card:
    'inline-flex items-center justify-center gap-2 min-h-[42px] px-3.5 py-2.5 !bg-[var(--yeet-tomato)] !text-white leading-[1.25] visited:!text-white hover:!bg-[var(--yeet-gray)] hover:!text-white active:!bg-[var(--yeet-gray)] active:!text-white focus-visible:!bg-[var(--yeet-tomato)] focus-visible:!text-white aria-pressed:!bg-[var(--yeet-gray)] aria-pressed:!text-white',
}

type RecipeActionProps = {
  variant: keyof typeof ACTION_VARIANTS
  href?: string
  target?: string
  rel?: string
  pressed?: boolean
  onClick?: () => void
  children: ReactNode
}

export function RecipeAction({
  variant,
  href,
  target,
  rel,
  pressed,
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
    <button type="button" aria-pressed={pressed} onClick={onClick} className={className}>
      {children}
    </button>
  )
}
