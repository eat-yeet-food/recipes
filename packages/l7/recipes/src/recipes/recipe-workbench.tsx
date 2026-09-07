import { Settings2 } from 'lucide-react'

import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { ActiveRecipeWorkbench } from './workbench-registry'

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

export function AdjustRecipeButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return <button type="button" onClick={onClick} className={compact ? 'inline-flex items-center gap-1 font-extrabold text-[var(--yeet-tomato-strong)] underline underline-offset-4 print:hidden' : 'inline-flex min-h-9 items-center gap-1.5 border border-[var(--yeet-gray)] px-3 text-xs font-extrabold uppercase print:hidden'}><Settings2 className="size-4" />Adjust recipe</button>
}
