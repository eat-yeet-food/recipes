import type { ComponentProps } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { fieldClassName } from './input'
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(fieldClassName, 'min-h-24', className)} {...props} />
}
