'use client'
import type { ReactNode } from 'react'

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
  const buttonVariant = pressed ? 'on-ink' : variant === 'hero' ? 'utility' : 'default'
  const size = variant === 'hero' ? 'sm' : 'default'
  const className = variant === 'hero' ? 'w-40 max-w-full' : undefined
  if (href) return <Button asChild variant={buttonVariant} size={size} className={className}><a href={href} target={target} rel={rel}>{children}</a></Button>
  return <Button
    variant={buttonVariant}
    size={size}
    className={className}
    onClick={onClick}
    aria-pressed={pressed}
  >{children}</Button>
}
