import { Book, Printer, Share2 } from 'lucide-react'

import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { createPageBlockRegistry, registerSharedPageBlocks, type PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { RecipeAction } from './recipe-actions'

const Html = ({ as: Tag = 'div', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />
)

export type RecipePageBlockContext = {
  page: RecipeContent
  siteUrl: string
  cookMode: boolean
  firstRecipeBlockIndex: number
  printPage: () => void
  pinUrl: URL
  onToggleCookMode: () => void
}

function MetaList({ page }: { page: RecipeContent }) {
  const items = [
    ['Prep Time', humanizeMinutes(page.prepMinutes)],
    ['Cook Time', humanizeMinutes(page.cookMinutes)],
    ['Total Time', humanizeMinutes(page.totalMinutes)],
    ['Yield', formatYield(page.yieldAmount, page.yieldUnit)],
  ].filter(([, value]) => value)

  return (
    <dl className="yeet-meta-grid grid grid-cols-2 gap-px mt-7 mb-1 bg-[var(--yeet-border)] border border-[var(--yeet-border)] max-[640px]:grid-cols-1">
      {items.map(([label, value]) => (
        <div key={label} className="bg-[var(--yeet-light-pink)] p-3.5">
          <dt className="mb-1 text-[var(--yeet-tomato-strong)] text-[11px] uppercase">{label}</dt>
          <dd className="m-0 text-sm font-extrabold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RecipeList({ sections, ordered = false }: { sections: Section[]; ordered?: boolean }) {
  if (sections.length === 0) return null
  const List = ordered ? 'ol' : 'ul'
  const listClass = `m-0 pl-[22px] ${ordered ? 'list-decimal' : 'list-disc'}`

  return (
    <div className="[&>section+section]:mt-[18px]">
      {sections.map((section, index) => (
        <section key={index}>
          {section.title && (
            <h4 className="mt-[22px] mb-2.5 text-[13px] uppercase text-[var(--yeet-tomato)]">{section.title}</h4>
          )}
          <List className={listClass}>
            {section.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="mb-[13px] pl-1.5 text-base leading-[1.72] marker:font-[family-name:var(--yeet-sans)] marker:text-base marker:font-extrabold marker:text-[var(--yeet-gray)]"
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
          className="mb-[13px] pl-1.5 text-base leading-[1.72] marker:font-[family-name:var(--yeet-sans)] marker:text-base marker:font-extrabold marker:text-[var(--yeet-gray)]"
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
        <p className="yeet-kicker mb-[18px] text-[var(--yeet-tomato)] text-xs uppercase">
          Recipe
        </p>
        <h2 className="m-0 mb-5 text-[44px] leading-[0.98] font-bold max-[640px]:text-[34px]">{page.title}</h2>
        {page.description && <p className="m-0 mb-6 text-base leading-[1.7]">{page.description}</p>}
        <MetaList page={page} />
        <div
          data-recipe-card-actions=""
          className={`grid grid-cols-3 gap-3 mt-6 mb-1 max-[640px]:grid-cols-1 print:hidden ${cookMode ? 'sticky top-3 z-[var(--z-recipe-actions)] bg-white pb-3' : ''}`}
          aria-label="Recipe card actions"
        >
          <RecipeAction variant="card" onClick={printPage}>
            <Printer className="size-3.5 max-[640px]:hidden" />
            Print Recipe
          </RecipeAction>
          <RecipeAction variant="card" href={pinUrl.toString()} target="_blank" rel="noreferrer">
            <Share2 className="size-3.5 max-[640px]:hidden" />
            Pin Recipe
          </RecipeAction>
          <RecipeAction
            variant="card"
            pressed={cookMode}
            onClick={onToggleCookMode}
          >
            <Book className="size-3.5 max-[640px]:hidden" />
            Cook Mode
          </RecipeAction>
        </div>
      </div>

      {block.ingredients.length > 0 && (
        <section>
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--yeet-border)] text-[34px] leading-none font-bold">
            Ingredients
          </h3>
          <RecipeList sections={block.ingredients} />
        </section>
      )}

      {block.steps.length > 0 && (
        <section>
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--yeet-border)] text-[34px] leading-none font-bold">
            Instructions
          </h3>
          <RecipeList sections={block.steps} ordered />
        </section>
      )}

      {block.equipment.length > 0 && (
        <section>
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--yeet-border)] text-[34px] leading-none font-bold">
            Equipment
          </h3>
          <RecipeList sections={block.equipment} />
        </section>
      )}

      {(block.notes.length > 0 || block.tips.length > 0) && (
        <section>
          <h3 className="m-0 pt-[30px] pb-3 border-t border-[var(--yeet-border)] text-[34px] leading-none font-bold">
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
