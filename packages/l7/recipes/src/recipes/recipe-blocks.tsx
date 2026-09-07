import { Printer, Share2 } from 'lucide-react'

import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { createPageBlockRegistry, registerSharedPageBlocks, type PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { CookModeSwitch, RecipeAction } from './recipe-actions'
import { AdjustRecipeButton } from './recipe-workbench'
import { RecipeFacts } from './recipe-facts'

const Html = ({ as: Tag = 'div', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} data-prose="" dangerouslySetInnerHTML={{ __html: html }} />
)

export type RecipePageBlockContext = {
  page: RecipeContent
  siteUrl: string
  cookMode: boolean
  firstRecipeBlockIndex: number
  printPage: () => void
  pinUrl: URL
  onToggleCookMode: () => void
  workbenchSummary?: string
  onOpenWorkbench?: () => void
}

function MetaList({ page }: { page: RecipeContent }) {
  const items: [string, string][] = [
    ['Prep Time', humanizeMinutes(page.prepMinutes)],
    ['Cook Time', humanizeMinutes(page.cookMinutes)],
    ['Total Time', humanizeMinutes(page.totalMinutes)],
    ['Yield', formatYield(page.yieldAmount, page.yieldUnit)],
  ].map(([label, value]): [string, string] => [label, value]).filter(([, value]) => value)

  return <RecipeFacts items={items} />
}

export function RecipeList({ sections, ordered = false }: { sections: Section[]; ordered?: boolean }) {
  if (sections.length === 0) return null
  const List = ordered ? 'ol' : 'ul'
  const listClass = `m-0 pl-[22px] ${ordered ? 'list-decimal' : 'list-disc'}`

  return (
    <div className="[&>section+section]:mt-[18px]">
      {sections.map((section) => (
        <section key={section.id}>
          {section.title && (
            <h4 className="mt-[22px] mb-2.5 text-[13px] font-bold uppercase text-[var(--color-primary)]">{section.title}</h4>
          )}
          <List className={listClass}>
            {section.items.map((item, itemIndex) => (
              <li
                key={section.itemIds[itemIndex] ?? itemIndex}
                className="mb-[13px] pl-1.5 text-base leading-[1.72] marker:font-[family-name:var(--font-body)] marker:text-base marker:font-extrabold marker:text-[var(--color-ink)]"
              >
                <Html as="span" html={item} />
              </li>
            ))}
          </List>
        </section>
      ))}
    </div>
  )
}

function FlatList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  if (items.length === 0) return null
  const List = ordered ? 'ol' : 'ul'
  const listClass = `m-0 pl-[22px] ${ordered ? 'list-decimal' : 'list-disc'}`

  return (
    <List className={listClass}>
      {items.map((item, index) => (
        <li
          key={index}
          className="mb-[13px] pl-1.5 text-base leading-[1.72] marker:font-[family-name:var(--font-body)] marker:text-base marker:font-extrabold marker:text-[var(--color-ink)]"
        >
          <Html as="span" html={item} />
        </li>
      ))}
    </List>
  )
}

function RecipeBlockView({
  block,
  index,
  context,
}: {
  block: RecipeBlock
  index: number
  context: RecipePageBlockContext
}) {
  const id = index === context.firstRecipeBlockIndex ? 'recipe-card' : undefined
  const { page, cookMode, pinUrl, printPage, onToggleCookMode } = context

  return (
    <section id={id} className="scroll-mt-20">
      <div className="pb-2.5">
        <p className="mb-[18px] text-[var(--color-primary)] text-xs uppercase">
          Recipe
        </p>
        <h2 className="m-0 mb-5 text-[44px] leading-[0.98] font-bold max-[640px]:text-[34px]">{page.title}</h2>
        {page.description && <p className="m-0 mb-6 text-base leading-[1.7]">{page.description}</p>}
        <MetaList page={page} />
        <div
          data-recipe-card-actions=""
          className={`grid grid-cols-3 gap-3 mt-6 mb-1 max-[640px]:grid-cols-1 print:hidden ${cookMode ? 'sticky top-3 z-[var(--z-recipe-actions)] bg-white' : ''}`}
          role="group" aria-label="Recipe card actions"
        >
          <RecipeAction variant="card" onClick={printPage}>
            <Printer className="size-3.5 max-[640px]:hidden" />
            Print Recipe
          </RecipeAction>
          <RecipeAction variant="card" href={pinUrl.toString()} target="_blank" rel="noreferrer">
            <Share2 className="size-3.5 max-[640px]:hidden" />
            Pin Recipe
          </RecipeAction>
          <CookModeSwitch checked={cookMode} onCheckedChange={onToggleCookMode} />
        </div>
      </div>

      {block.ingredients.length > 0 && (
        <section>
          {context.workbenchSummary && context.onOpenWorkbench && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-field bg-brand px-4 py-3 print:border print:bg-white">
              <div>
                <div className="font-action text-[11px] font-bold uppercase tracking-[0.8px] text-[var(--color-primary)]">Your recipe</div>
                <div className="mt-1 text-sm font-bold">{context.workbenchSummary}</div>
              </div>
              <AdjustRecipeButton compact onClick={context.onOpenWorkbench} />
            </div>
          )}
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Ingredients
          </h3>
          <RecipeList sections={block.ingredients} />
        </section>
      )}

      {block.steps.length > 0 && (
        <section>
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Instructions
          </h3>
          <RecipeList sections={block.steps} ordered />
        </section>
      )}

      {block.equipment.length > 0 && (
        <section>
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Equipment
          </h3>
          <RecipeList sections={block.equipment} />
        </section>
      )}

      {(block.notes.length > 0 || block.tips.length > 0) && (
        <section>
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Notes
          </h3>
          <FlatList items={[...block.notes, ...block.tips]} />
        </section>
      )}
    </section>
  )
}

export function registerRecipePageBlocks(registry: PageBlockRegistry<RecipePageBlockContext>) {
  return registerSharedPageBlocks(registry)
    .register('recipe', ({ block, index, context }) => <RecipeBlockView block={block} index={index} context={context} />)
}

export function createRecipePageBlockRegistry() {
  return registerRecipePageBlocks(createPageBlockRegistry<RecipePageBlockContext>())
}
