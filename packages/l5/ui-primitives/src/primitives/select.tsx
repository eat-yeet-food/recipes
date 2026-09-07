import type { ComponentProps } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { fieldClassName } from './input'

/** Native select retains platform keyboard and assistive-technology behavior. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select data-slot="select" className={cn(fieldClassName, className)} {...props} />
}
