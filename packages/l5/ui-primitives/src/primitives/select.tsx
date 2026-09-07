import type { ComponentProps } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { fieldClassName, fieldSurfaceClasses, type FieldSurface } from './input'

/** Native select retains platform keyboard and assistive-technology behavior. */
export function Select({ className, surface = 'default', ...props }: ComponentProps<'select'> & { surface?: FieldSurface }) {
  return <select data-slot="select" data-surface={surface} className={cn(fieldClassName, fieldSurfaceClasses[surface], className)} {...props} />
}
