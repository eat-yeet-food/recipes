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
  const size = variant === 'hero' ? 'sm' : 'default'
  if (href) return <Button asChild variant={buttonVariant} size={size} className={className}><a href={href} target={target} rel={rel}>{children}</a></Button>
  return <Button variant={buttonVariant} size={size} onClick={onClick} className={className}>{children}</Button>
}

const SWITCH_SPACING = { hero: 'gap-3', card: 'gap-2' } as const

export function CookModeSwitch({ checked, onCheckedChange, label = 'Cook Mode', variant = 'card' }: { checked: boolean; onCheckedChange: () => void; label?: string; variant?: keyof typeof SWITCH_SPACING }) {
  const id = useId()
  return (
    <div className={`inline-flex min-h-11 w-fit shrink-0 items-center justify-self-center ${SWITCH_SPACING[variant]}`}>
      <label htmlFor={id} className="cursor-pointer whitespace-nowrap font-action text-sm font-bold text-ink">{label}</label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
