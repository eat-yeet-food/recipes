import type { ReactNode } from 'react'

import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'

type RecipeActionProps = {
  variant: 'hero' | 'card'
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
  const className = variant === 'hero' ? 'max-[640px]:flex-1' : ''
  if (href) return <Button asChild className={className}><a href={href} target={target} rel={rel}>{children}</a></Button>
  return <Button onClick={onClick} className={className}>{children}</Button>
}

export function CookModeSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: () => void }) {
  return (
    <Button variant="ghost"
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onCheckedChange}
      className="justify-between gap-3"
    >
      <span>Cook Mode</span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${checked ? 'bg-ink' : 'bg-muted-foreground'}`}
      >
        <span className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </Button>
  )
}
