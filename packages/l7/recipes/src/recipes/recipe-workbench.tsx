import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
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
  return <Button onClick={onClick} variant={compact ? 'link' : 'default'} size={compact ? 'sm' : 'default'} className="print:hidden"><Settings2 className="size-4" />Adjust recipe</Button>
}
