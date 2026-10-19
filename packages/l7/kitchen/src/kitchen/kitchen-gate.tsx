'use client'
import type { ReactNode } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { SignInLink } from '@eat-yeet/l6-ui-shell/account/account-nav'
import { useAccount } from '@eat-yeet/l6-ui-shell/account/account'
import { buttonVariants } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { kitchenPageClass } from './kitchen-ui'

/** A short status page in the kitchen's white layout: loading, signed out, missing or failed. */
export function KitchenMessage({ title, children, action, busy = false }: { title: string; children: ReactNode; action?: ReactNode; busy?: boolean }) {
  return <section aria-busy={busy || undefined} className={cn(kitchenPageClass, 'py-16')}>
    <div className="grid max-w-[560px] gap-3">
      <h1 className="font-display text-[36px] leading-tight font-bold">{title}</h1>
      <p role={busy ? 'status' : undefined} className="text-base leading-relaxed text-muted-foreground">{children}</p>
      {action && <div className="mt-3 flex flex-wrap gap-4">{action}</div>}
    </div>
  </section>
}

/** Saved formulas belong to a member; signed-out visitors sign in and come back here. */
export function KitchenGate({ what, children }: { what: string; children: ReactNode }) {
  const { status } = useAccount()
  if (status === 'unknown') return <KitchenMessage title="Opening Test Kitchen…" busy>Checking your account.</KitchenMessage>
  if (status === 'signed-out') return <KitchenMessage title="Sign in to open this formula"
    action={<SignInLink className={buttonVariants()}>Sign in with Google</SignInLink>}>
    Test Kitchen formulas are saved to your account. Sign in to see {what}; you’ll come straight back here.
  </KitchenMessage>
  return <>{children}</>
}
