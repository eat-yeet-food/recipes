'use client'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { TextSelect } from '@eat-yeet/l5-ui-primitives/primitives/text-select'
import { Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'

import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { ActiveRecipeWorkbench, RecipeWorkbenchApplyOptions, RecipeWorkbenchChoices, RecipeWorkbenchChoicesProps, RecipeWorkbenchSummary } from './workbench-registry'

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

function PluginChoices({ useChoices, children, ...props }: RecipeWorkbenchChoicesProps & {
  useChoices: (props: RecipeWorkbenchChoicesProps) => RecipeWorkbenchChoices | null
  children: (choices: RecipeWorkbenchChoices | null) => ReactNode
}) {
  return children(useChoices(props))
}

/** Supplies the plugin's choices, if it offers any, to the adjustment summary. */
export function RecipeWorkbenchChoicesSource({
  recipe,
  workbench,
  onApply,
  storageScope,
  children,
}: {
  recipe: RecipeContent
  workbench: ActiveRecipeWorkbench
  onApply: (state: unknown, options?: RecipeWorkbenchApplyOptions) => void
  storageScope: string
  children: (choices: RecipeWorkbenchChoices | null) => ReactNode
}) {
  const useChoices = workbench.plugin.useChoices
  if (!useChoices) return children(null)
  return <PluginChoices key={`${workbench.plugin.id}:${recipe.slug}`} useChoices={useChoices} recipe={recipe} config={workbench.config} state={workbench.state} onApply={onApply} hasSharedConfiguration={workbench.hasSharedConfiguration} storageScope={storageScope}>{children}</PluginChoices>
}

export function AdjustRecipeButton({ onClick }: { onClick: () => void }) {
  return <Button onClick={onClick} aria-haspopup="dialog" className="print:hidden"><Settings2 className="size-4" />Adjust recipe</Button>
}

export function RecipeAdjustmentSummary({ summary, onOpen, choices }: { summary: RecipeWorkbenchSummary; onOpen: () => void; choices?: RecipeWorkbenchChoices | null }) {
  return <div className="mb-6 flex items-center justify-between gap-6 py-3 max-[640px]:flex-col max-[640px]:items-start" data-recipe-adjustment>
    <div className="min-w-0 max-[640px]:max-w-full">
      <div className="flex min-w-0 items-center gap-1.5 font-action text-[11px] font-bold uppercase tracking-[0.8px] text-ink">
        <span className="shrink-0">Your recipe</span>
        {choices && <>
          <span aria-hidden="true" className="print:hidden">·</span>
          <TextSelect label={choices.label} value={choices.value} options={choices.options} onChange={choices.onChange} className="-my-1 print:hidden" />
        </>}
      </div>
      <div className="mt-1 text-xl font-bold text-ink">{summary.heading}</div>
      <div className="mt-1 text-sm text-muted-foreground">{summary.details}</div>
      {choices?.notice && <p role="status" className="mt-1 text-xs text-danger print:hidden">{choices.notice}</p>}
    </div>
    <AdjustRecipeButton onClick={onOpen} />
  </div>
}
