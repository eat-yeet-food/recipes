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
        secondary: 'bg-secondary text-secondary-foreground hover:bg-action-hover',
        outline: 'bg-secondary text-secondary-foreground hover:bg-action-hover',
        ghost: 'bg-transparent text-ink',
        utility: 'border border-ink bg-transparent text-ink hover:bg-muted',
        'on-ink': 'bg-brand text-ink hover:bg-brand-alt',
        'quiet-on-ink': 'bg-transparent text-action-label',
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
      { variant: ['default', 'secondary', 'outline', 'utility', 'on-ink', 'danger'], className: 'control-focus' },
      {
        variant: ['link', 'ghost', 'quiet-on-ink'],
        size: ['default', 'xs', 'sm', 'lg'],
        className: 'min-h-6 justify-start rounded-none p-0 text-left underline decoration-1 underline-offset-4 cursor-pointer hover:decoration-2 focus-visible:underline focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-4 disabled:bg-transparent disabled:no-underline',
      },
      { variant: ['link', 'ghost'], size: ['icon', 'icon-xs', 'icon-sm', 'icon-lg'], className: 'control-focus hover:bg-accent' },
      { variant: 'quiet-on-ink', size: ['icon', 'icon-xs', 'icon-sm', 'icon-lg'], className: 'control-focus hover:bg-action-hover' },
      { variant: 'quiet-on-ink', className: 'disabled:text-action-label/60' },
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
export { Button, buttonVariants }
