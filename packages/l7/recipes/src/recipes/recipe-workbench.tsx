'use client'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Settings2 } from 'lucide-react'

import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { ActiveRecipeWorkbench, RecipeWorkbenchSummary } from './workbench-registry'

export function RecipeWorkbenchHost({
  recipe,
  workbench,
  onApply,
  storageScope,
  open,
  onOpenChange,
}: {
  recipe: RecipeContent
  workbench: ActiveRecipeWorkbench
  onApply: (state: unknown) => void
  storageScope: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const Drawer = workbench.plugin.Drawer
  return <Drawer recipe={recipe} config={workbench.config} state={workbench.state} onApply={onApply} hasSharedConfiguration={workbench.hasSharedConfiguration} storageScope={storageScope} open={open} onOpenChange={onOpenChange} />
}

export function AdjustRecipeButton({ onClick }: { onClick: () => void }) {
  return <Button onClick={onClick} aria-haspopup="dialog" className="print:hidden"><Settings2 className="size-4" />Adjust recipe</Button>
}

export function RecipeAdjustmentSummary({ summary, onOpen }: { summary: RecipeWorkbenchSummary; onOpen: () => void }) {
  return <div className="mb-6 flex items-center justify-between gap-6 py-3 max-[640px]:flex-col max-[640px]:items-start" data-recipe-adjustment>
    <div className="min-w-0">
      <div className="font-action text-[11px] font-bold uppercase tracking-[0.8px] text-ink">Your recipe</div>
      <div className="mt-1 text-xl font-bold text-ink">{summary.heading}</div>
      <div className="mt-1 text-sm text-muted-foreground">{summary.details}</div>
    </div>
    <AdjustRecipeButton onClick={onOpen} />
  </div>
}
