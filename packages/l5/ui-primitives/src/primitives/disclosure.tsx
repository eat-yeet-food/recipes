'use client'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'

/** A labelled show/hide group with one chevron treatment. Controlled or uncontrolled. */
export function Disclosure({ label, children, defaultOpen = false, open: openProp, onOpenChange, className, triggerClassName, panelClassName, triggerProps, panelProps }: {
  label: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  triggerClassName?: string
  panelClassName?: string
  /** Extra attributes (data hooks) for the trigger and panel. */
  triggerProps?: Omit<ComponentProps<'button'>, 'onClick' | 'className' | 'children'> & Record<`data-${string}`, string | boolean | undefined>
  panelProps?: Omit<ComponentProps<'div'>, 'className' | 'children' | 'hidden'> & Record<`data-${string}`, string | boolean | undefined>
}) {
  const [own, setOwn] = useState(defaultOpen)
  const open = openProp ?? own
  const id = useId()
  const toggle = () => { const next = !open; if (openProp === undefined) setOwn(next); onOpenChange?.(next) }
  return <div data-slot="disclosure" data-state={open ? 'open' : 'closed'} className={className}>
    <button type="button" {...triggerProps} aria-expanded={open} aria-controls={id} onClick={toggle} className={cn('control-focus flex min-h-11 w-full items-center justify-between gap-3 text-left font-action text-sm font-bold text-ink', triggerClassName)}>
      <span className="min-w-0">{label}</span>
      <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 transition-transform motion-reduce:transition-none', open && 'rotate-180')} />
    </button>
    <div id={id} {...panelProps} hidden={!open} className={panelClassName}>{children}</div>
  </div>
}
