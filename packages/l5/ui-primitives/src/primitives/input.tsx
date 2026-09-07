import * as React from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'

export const fieldClassName = 'min-h-11 w-full min-w-0 rounded-field border-0 bg-ink px-4 py-3 font-body text-base text-action-label placeholder:text-action-label/80 focus-visible:outline-2 focus-visible:outline-current focus-visible:-outline-offset-4 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed aria-invalid:bg-danger aria-invalid:text-white'
export const fieldSurfaceClasses = {
  default: '',
  'on-ink': 'bg-action-label text-ink placeholder:text-muted-foreground aria-invalid:placeholder:text-white',
} as const
export type FieldSurface = keyof typeof fieldSurfaceClasses

function Input({ className, type, surface = 'default', ...props }: React.ComponentProps<'input'> & { surface?: FieldSurface }) {
  return <input type={type} data-slot="input" data-surface={surface} className={cn(fieldClassName, fieldSurfaceClasses[surface], className)} {...props} />
}
export { Input }
