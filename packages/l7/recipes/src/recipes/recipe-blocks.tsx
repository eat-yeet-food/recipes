'use client'
import type { RecipeBlock, Section } from '@eat-yeet/l4-content-model/blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { createPageBlockRegistry, registerSharedPageBlocks, type PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { haptic } from '@eat-yeet/l5-ui-primitives/primitives/haptics'
import { createContext, useContext, useEffect, useId, useState, type MouseEvent, type ReactNode } from 'react'
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

/** Browser key for the step a reader marked as where they are, per recipe. */
export const activeStepKey = (slug: string) => `eatyeet:step:${slug}`

const stepId = (section: Section, index: number) => section.itemIds[index] ?? `${section.id}:${index}`

type StepState = { active: string | null; done: (id: string) => boolean; toggle: (id: string) => void }
const StepContext = createContext<StepState | null>(null)

/** The marked step, remembered in this browser; steps before it read as done. */
function useActiveStep(slug: string, order: string[]): StepState {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    try { setActive(localStorage.getItem(activeStepKey(slug))) } catch { /* storage blocked */ }
  }, [slug])
  const activeIndex = active ? order.indexOf(active) : -1
  return {
    active: activeIndex >= 0 ? active : null,
    done: (id) => activeIndex >= 0 && order.indexOf(id) < activeIndex,
    toggle: (id) => {
      haptic()
      const next = id === active ? null : id
      setActive(next)
      try { if (next) localStorage.setItem(activeStepKey(slug), next); else localStorage.removeItem(activeStepKey(slug)) } catch { /* ignore */ }
    },
  }
}

/** Tapping anywhere on a step marks it, except on its links. */
function stepRowClick(toggle: () => void) {
  return (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return
    toggle()
  }
}

const stepRowClasses = (active: boolean, done: boolean) => cn(
  'relative -mx-2 cursor-pointer rounded-field px-2 py-1.5 transition-[background-color,opacity] duration-150 motion-reduce:transition-none print:cursor-auto print:bg-transparent print:opacity-100',
  active && 'bg-brand-soft',
  done && 'opacity-45',
)

/**
 * Steps of a timed process on a time rail: plum badges carrying the time,
 * joined by a line through their centres, with rests in muted text.
 */
function TimedList({ section }: { section: Section }) {
  const times = section.itemTimes!
  const originId = useId()
  const steps = useContext(StepContext)
  return (<>
    {section.timeOrigin && <p id={originId} className="-mt-1 mb-3 text-caption text-muted-foreground">{section.timeOrigin}</p>}
    <ol data-timed-steps="" aria-describedby={section.timeOrigin ? originId : undefined} className="m-0 grid list-none gap-3 p-0">
      {section.items.map((item, index) => {
        const time = times[index]
        const id = stepId(section, index)
        const active = steps?.active === id
        const toggle = () => steps?.toggle(id)
        return (
          <li key={id} data-step-state={active ? 'active' : steps?.done(id) ? 'done' : undefined} aria-current={active ? 'step' : undefined} onClick={stepRowClick(toggle)}
            className={cn(stepRowClasses(active, Boolean(steps?.done(id))), 'grid grid-cols-[40px_minmax(0,1fr)] gap-3.5 text-base leading-[1.72] [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-[46px] [&:not(:last-child)]:before:-bottom-[18px] [&:not(:last-child)]:before:left-[27px] [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-ink')}>
            <button type="button" onClick={toggle} aria-pressed={active} aria-label={`${time.label}: mark as the step you're on`}
              className={cn('relative z-[1] flex h-10 min-w-10 items-center justify-center self-start justify-self-center rounded-full px-1 font-action text-xs font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink print:bg-white print:text-ink print:shadow-[inset_0_0_0_1px_currentColor]', active ? 'bg-brand text-ink' : 'bg-ink text-brand')}>
              <time dateTime={`PT${time.minutes}M`}>{time.label}</time>
            </button>
            <div className="min-w-0 pt-1.5">
              <Html as="span" html={item} />
              {time.rest && <span className="block text-sm text-muted-foreground">{time.rest}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  </>)
}

/** Numbered steps: big pink serif numerals, distinct from the timeline's plum badges. */
function NumberedList({ section }: { section: Section }) {
  const steps = useContext(StepContext)
  return <ol className="m-0 grid list-none gap-2 p-0">
    {section.items.map((item, index) => {
      const id = stepId(section, index)
      const active = steps?.active === id
      const toggle = () => steps?.toggle(id)
      return <li key={id} data-step-state={active ? 'active' : steps?.done(id) ? 'done' : undefined} aria-current={active ? 'step' : undefined} onClick={stepRowClick(toggle)}
        className={cn(stepRowClasses(active, Boolean(steps?.done(id))), 'grid grid-cols-[36px_minmax(0,1fr)] items-baseline gap-3.5 text-base leading-[1.72]')}>
        <button type="button" onClick={toggle} aria-pressed={active} aria-label={`Step ${index + 1}: mark as the step you're on`}
          className={cn('justify-self-center font-display text-title font-extrabold leading-none tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink print:text-base print:text-ink', active ? 'text-ink' : 'text-brand')}>
          {index + 1}
        </button>
        <Html as="span" html={item} className="min-w-0" />
      </li>
    })}
  </ol>
}

/** A leading amount ("287g", "¼ tsp (0.72g)", "1 can") shown bold pink on the plum card. */
const AMOUNT = /^([\d¼½¾⅛⅓⅔⅜⅝⅞][\d¼½¾⅛⅓⅔⅜⅝⅞.,/ -]*?(?:\s?(?:g|kg|ml|l|oz|lb|lbs|tsp|tbsp|cups?|cans?|cloves?)\b)?(?:\s*\([^)<]*\))?)(?=\s)/
export function emphasizeAmount(html: string) {
  return html.replace(AMOUNT, '<strong class="font-bold text-brand print:text-ink">$1</strong>')
}

export function RecipeList({ sections, ordered = false, tone = 'light' }: { sections: Section[]; ordered?: boolean; tone?: 'light' | 'on-dark' }) {
  if (sections.length === 0) return null
  const dark = tone === 'on-dark'
  const List = ordered ? 'ol' : 'ul'
  const listClass = `m-0 pl-[22px] ${ordered ? 'list-decimal' : 'list-disc'}`

  return (
    <div className="[&>section+section]:mt-[18px]">
      {sections.map((section) => (
        <section key={section.id}>
          {section.title && (
            <Eyebrow as="h3" tone={dark ? 'brand' : 'ink'} className={dark ? 'mt-4 mb-1 print:text-ink' : 'mt-[22px] mb-2.5'}>{section.title}</Eyebrow>
          )}
          {ordered ? (section.itemTimes?.length === section.items.length ? <TimedList section={section} /> : <NumberedList section={section} />)
            : dark ? <ul className="m-0 list-none p-0 print:list-disc print:pl-[22px]">
              {section.items.map((item, itemIndex) => (
                <li key={section.itemIds[itemIndex] ?? itemIndex} className="border-t border-white/15 py-2 text-base leading-normal print:border-0 print:py-0.5">
                  <Html as="span" html={emphasizeAmount(item)} />
                </li>
              ))}
            </ul>
            : <List className={listClass}>
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
  const order = block.steps.flatMap((section) => section.items.map((_, itemIndex) => stepId(section, itemIndex)))
  const steps = useActiveStep(`${context.page.slug}:${index}`, order)

  return (
    <section id={id} className="scroll-mt-20">
      {index === context.firstRecipeBlockIndex && context.beforeIngredients && <div className="max-w-[var(--layout-recipe-copy)] pb-2">{context.beforeIngredients}</div>}

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-14">
        {block.ingredients.length > 0 && (
          <section data-ingredients-card="" className="rounded-surface bg-ink p-5 text-on-dark-label md:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto print:static print:max-h-none print:rounded-none print:bg-white print:p-0 print:text-ink">
            <SectionTitle className="pb-1 text-white print:text-ink">Ingredients</SectionTitle>
            <RecipeList sections={block.ingredients} tone="on-dark" />
          </section>
        )}

        {block.steps.length > 0 && (
          <section className="mt-10 lg:mt-0">
            <SectionTitle className="pb-1">Instructions</SectionTitle>
            <StepContext.Provider value={steps}>
              <RecipeList sections={block.steps} ordered />
            </StepContext.Provider>
          </section>
        )}
      </div>

      <div className="max-w-[var(--layout-recipe-copy)]">
        {block.equipment.length > 0 && (
          <section className="mt-12">
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
      </div>
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
