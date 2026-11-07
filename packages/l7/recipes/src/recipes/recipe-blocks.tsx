'use client'
import { formatYield, humanizeMinutes } from '@eat-yeet/l2-recipe-domain/format'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { createPageBlockRegistry, registerSharedPageBlocks, type PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { useId, type ReactNode } from 'react'
import { RecipeFacts } from './recipe-facts'
import { Eyebrow, SectionTitle } from '@eat-yeet/l5-ui-primitives/primitives/typography'

const Html = ({ as: Tag = 'div', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} data-prose="" dangerouslySetInnerHTML={{ __html: html }} />
)

export type RecipePageBlockContext = {
  page: RecipeContent
  siteUrl: string
  firstRecipeBlockIndex: number
  /** Rendered once, between the facts and Ingredients of the first recipe block. */
  beforeIngredients?: ReactNode
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

/**
 * Steps of a timed process on a time rail: a marker column replaces the list
 * number, filled where the dough changes state, with rests in muted text.
 */
function TimedList({ section }: { section: Section }) {
  const times = section.itemTimes!
  const originId = useId()
  return (<>
    {section.timeOrigin && <p id={originId} className="-mt-1 mb-3.5 text-caption text-muted-foreground">{section.timeOrigin}</p>}
    <ol data-timed-steps="" aria-describedby={section.timeOrigin ? originId : undefined} className="m-0 grid list-none gap-[18px] p-0">
      {section.items.map((item, index) => {
        const time = times[index]
        return (
          <li key={section.itemIds[index] ?? index} className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-3 text-base leading-[1.72] [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-4 [&:not(:last-child)]:before:-bottom-[34px] [&:not(:last-child)]:before:left-[31px] [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-border print:before:bg-ink">
            <time
              dateTime={`PT${time.minutes}M`}
              className={`relative z-[1] mt-0.5 self-start justify-self-center min-w-14 rounded-control px-2 py-0.5 text-center font-action text-sm leading-[1.6] font-bold tabular-nums ${time.emphasis ? 'bg-ink text-on-dark-label' : 'bg-white text-ink shadow-[inset_0_0_0_1px_currentColor]'}`}
            >
              {time.label}
            </time>
            <div className="min-w-0">
              <Html as="span" html={item} />
              {time.rest && <span className="block text-sm text-muted-foreground">{time.rest}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  </>)
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
            <Eyebrow as="h3" className="mt-[22px] mb-2.5">{section.title}</Eyebrow>
          )}
          {ordered && section.itemTimes?.length === section.items.length ? <TimedList section={section} /> : <List className={listClass}>
            {section.items.map((item, itemIndex) => (
              <li
                key={section.itemIds[itemIndex] ?? itemIndex}
                className="mb-[13px] pl-1.5 text-base leading-[1.72] marker:font-body marker:text-base marker:font-extrabold marker:text-ink"
              >
                <Html as="span" html={item} />
              </li>
            ))}
          </List>}
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
          className="mb-[13px] pl-1.5 text-base leading-[1.72] marker:font-body marker:text-base marker:font-extrabold marker:text-ink"
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
          {index === context.firstRecipeBlockIndex && context.beforeIngredients}
          <SectionTitle rule="top" className="pb-3">
            Ingredients
          </SectionTitle>
          <RecipeList sections={block.ingredients} />
        </section>
      )}

      {block.steps.length > 0 && (
        <section>
          <SectionTitle rule="top" className="pb-3">
            Instructions
          </SectionTitle>
          <RecipeList sections={block.steps} ordered />
        </section>
      )}

      {block.equipment.length > 0 && (
        <section>
          <SectionTitle rule="top" className="pb-3">
            Equipment
          </SectionTitle>
          <RecipeList sections={block.equipment} />
        </section>
      )}

      {(block.notes.length > 0 || block.tips.length > 0) && (
        <section>
          <SectionTitle rule="top" className="pb-3">
            Notes
          </SectionTitle>
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
