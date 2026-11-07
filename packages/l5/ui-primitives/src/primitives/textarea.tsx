import type { ComponentProps } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { fieldClassName, fieldSurfaceClasses, type FieldSurface } from './input'

/** Multi-line field. Same surfaces as Input: the light boxed default, or `underline` on page forms. */
export function Textarea({ className, surface = 'default', ...props }: ComponentProps<'textarea'> & { surface?: FieldSurface }) {
  return <textarea data-slot="textarea" data-surface={surface} className={cn(fieldClassName, fieldSurfaceClasses[surface], 'min-h-24', className)} {...props} />
}
