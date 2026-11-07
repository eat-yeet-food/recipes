import * as React from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'

export const fieldClassName = 'min-h-11 w-full min-w-0 rounded-field border border-input bg-white px-4 py-3 font-body text-base text-ink placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ink focus-visible:-outline-offset-4 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed aria-invalid:border-danger aria-invalid:border-2'
export const fieldSurfaceClasses = {
  // Light field: white, a 1px input-colored edge, plum text. Use in dialogs, cards and palettes.
  default: '',
  // Unboxed settings field on white: ink text over a single ink rule that thickens on focus.
  underline: 'rounded-none border-0 border-b border-ink bg-transparent px-0 text-ink placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-b-2 focus-visible:pb-[11px] disabled:bg-transparent aria-invalid:border-b-2 aria-invalid:border-danger',
} as const
export type FieldSurface = keyof typeof fieldSurfaceClasses

function Input({ className, type, surface = 'default', ...props }: React.ComponentProps<'input'> & { surface?: FieldSurface }) {
  return <input type={type} data-slot="input" data-surface={surface} className={cn(fieldClassName, fieldSurfaceClasses[surface], className)} {...props} />
}
export { Input }
