import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { createPageBlockRegistry, registerSharedPageBlocks, type PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { AdjustRecipeButton } from './recipe-workbench'
import { RecipeFacts } from './recipe-facts'

const Html = ({ as: Tag = 'div', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} data-prose="" dangerouslySetInnerHTML={{ __html: html }} />
)

export type RecipePageBlockContext = {
  page: RecipeContent
  siteUrl: string
  firstRecipeBlockIndex: number
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
            <h3 className="mt-[22px] mb-2.5 text-[13px] font-bold uppercase text-[var(--color-primary)]">{section.title}</h3>
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
  const { page } = context

  return (
    <section id={id} className="scroll-mt-20">
      <div className="pb-2.5">
        <MetaList page={page} />
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
          <h2 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Ingredients
          </h2>
          <RecipeList sections={block.ingredients} />
        </section>
      )}

      {block.steps.length > 0 && (
        <section>
          <h2 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Instructions
          </h2>
          <RecipeList sections={block.steps} ordered />
        </section>
      )}

      {block.equipment.length > 0 && (
        <section>
          <h2 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Equipment
          </h2>
          <RecipeList sections={block.equipment} />
        </section>
      )}

      {(block.notes.length > 0 || block.tips.length > 0) && (
        <section>
          <h2 className="m-0 pt-[30px] pb-3 border-t border-[var(--color-border)] text-[34px] leading-none font-bold">
            Notes
          </h2>
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
