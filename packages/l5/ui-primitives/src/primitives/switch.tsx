import type { ComponentProps } from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@eat-yeet/l0-foundation/utils'

/** A dedicated switch track; its visible label belongs beside the control. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-muted-foreground transition-colors after:absolute after:inset-x-0 after:-inset-y-2.5 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-ink motion-reduce:transition-none', className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-6 motion-reduce:transition-none" />
    </SwitchPrimitive.Root>
  )
}
