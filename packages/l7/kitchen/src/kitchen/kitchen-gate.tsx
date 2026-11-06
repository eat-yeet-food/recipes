'use client'
import type { ReactNode } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import type { KitchenClient } from './kitchen-client'
import { useNotebookClient } from './kitchen-local'
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

/** Waits for the account check (and any move of browser formulas to the account), then hands over the store. */
export function KitchenGate({ client, children }: { client: KitchenClient; children: (client: KitchenClient, local: boolean) => ReactNode }) {
  const notebook = useNotebookClient(client)
  if (!notebook.client) return <KitchenMessage title="Opening Notebook…" busy>Checking your account.</KitchenMessage>
  return <>{children(notebook.client, notebook.local)}</>
}
