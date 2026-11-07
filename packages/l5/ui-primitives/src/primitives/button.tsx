import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@eat-yeet/l0-foundation/utils'

const buttonStyles = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-control border-0 font-action text-sm font-bold leading-snug text-center whitespace-normal transition-colors select-none disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground aria-invalid:outline-2 aria-invalid:outline-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-action-hover',
        ghost: 'bg-transparent text-ink',
        utility: 'border border-ink bg-transparent text-ink hover:bg-muted',
        // Standalone pressed toggle (D22): plum outline when off, pink fill when on. Use <Toggle>.
        toggle: 'bg-transparent text-ink shadow-[inset_0_0_0_1.5px_currentColor] hover:bg-muted aria-pressed:bg-brand aria-pressed:shadow-none aria-pressed:hover:bg-brand forced-colors:aria-pressed:outline-2 forced-colors:aria-pressed:outline-[Highlight]',
        'on-dark': 'bg-brand text-ink hover:bg-brand-soft',
        'quiet-on-dark': 'bg-transparent text-on-dark-label',
        danger: 'bg-danger text-white hover:bg-danger',
        link: 'bg-transparent text-ink',
      },
      size: {
        default: 'min-h-11 px-5 py-3',
        xs: 'min-h-8 px-3 py-1 text-xs',
        sm: 'min-h-11 px-4 py-2 text-sm',
        lg: 'min-h-12 px-7 py-3 text-base',
        icon: 'size-11 p-0 focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-0',
        'icon-xs': 'size-8 p-0 focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-0',
        'icon-sm': 'size-11 p-0 focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-0',
        'icon-lg': 'size-12 p-0 focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-0',
      },
    },
    compoundVariants: [
      { variant: ['default', 'utility', 'toggle', 'on-dark', 'danger'], className: 'control-focus' },
      {
        variant: ['link', 'ghost', 'quiet-on-dark'],
        size: ['default', 'xs', 'sm', 'lg'],
        className: 'min-h-6 justify-start rounded-none p-0 text-left underline decoration-1 underline-offset-4 cursor-pointer hover:decoration-2 focus-visible:underline focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-4 disabled:bg-transparent disabled:no-underline',
      },
      { variant: ['link', 'ghost'], size: ['icon', 'icon-xs', 'icon-sm', 'icon-lg'], className: 'control-focus hover:bg-muted' },
      { variant: 'quiet-on-dark', size: ['icon', 'icon-xs', 'icon-sm', 'icon-lg'], className: 'control-focus hover:bg-action-hover' },
      { variant: 'quiet-on-dark', className: 'disabled:text-on-dark-label disabled:opacity-60' },
    ],
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function buttonVariants(props?: Parameters<typeof buttonStyles>[0]) {
  return cn(buttonStyles(props))
}

function Button({ className, variant = 'default', size = 'default', asChild = false, type = 'button', ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" data-variant={variant} data-size={size} type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
/** A standalone on/off control (search categories, Filters, Cooking view). Always exposes aria-pressed. */
function Toggle({ pressed, size = 'sm', ...props }: Omit<React.ComponentProps<typeof Button>, 'variant' | 'aria-pressed'> & { pressed: boolean }) {
  return <Button variant="toggle" size={size} aria-pressed={pressed} {...props} />
}
export { Button, buttonVariants, Toggle }
