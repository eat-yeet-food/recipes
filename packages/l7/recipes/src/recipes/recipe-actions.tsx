import { useId, type ReactNode } from 'react'

import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Switch } from '@eat-yeet/l5-ui-primitives/primitives/switch'

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
  const buttonVariant = variant === 'hero' ? 'utility' : 'default'
  if (href) return <Button asChild variant={buttonVariant} className={className}><a href={href} target={target} rel={rel}>{children}</a></Button>
  return <Button variant={buttonVariant} onClick={onClick} className={className}>{children}</Button>
}

export function CookModeSwitch({ checked, onCheckedChange, label = 'Cook Mode' }: { checked: boolean; onCheckedChange: () => void; label?: string }) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4">
      <label htmlFor={id} className="cursor-pointer font-action text-sm font-bold text-ink">{label}</label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
