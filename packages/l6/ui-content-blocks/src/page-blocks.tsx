import { Book, Printer, Share2 } from 'lucide-react'

import type { ReactNode } from 'react'

import { cn } from '@eat-yeet/l0-foundation/utils'
import { humanizeMinutes, formatYield } from '@eat-yeet/l2-recipe-domain/format'
import type { ImageBlock, MarkdownBlock, PageBlock, RecipeBlock, Section, YouTubeBlock } from '@eat-yeet/l4-content-model/blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

const Html = ({ as: Tag = 'div', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />
)

export type PageBlockRenderer<TBlock extends PageBlock, TContext> = (props: {
  block: TBlock
  index: number
  context: TContext
}) => ReactNode

export interface PageBlockRegistry<TContext> {
  register<TType extends PageBlock['type']>(
    type: TType,
    renderer: PageBlockRenderer<Extract<PageBlock, { type: TType }>, TContext>,
  ): PageBlockRegistry<TContext>
  resolve(block: PageBlock): PageBlockRenderer<PageBlock, TContext> | undefined
}

export type RecipePageBlockContext = {
  page: RecipeContent
  siteUrl: string
  cookMode: boolean
  firstRecipeBlockIndex: number
  printPage: () => void
  pinUrl: URL
  onToggleCookMode: () => void
}

export function createPageBlockRegistry<TContext>(): PageBlockRegistry<TContext> {
  const renderers = new Map<string, PageBlockRenderer<PageBlock, TContext>>()
  const registry: PageBlockRegistry<TContext> = {
    register(type, renderer) {
      renderers.set(type, renderer as PageBlockRenderer<PageBlock, TContext>)
      return registry
    },
    resolve(block) {
      return renderers.get(block.type)
    },
  }

  return registry
}

const IMAGE_COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
} satisfies Record<1 | 2 | 3, string>

function blockImageUrl(image: { src: string; imageHash?: string }) {
  if (/^(https?:)?\/\//.test(image.src) || image.src.startsWith('data:')) return image.src
  const path = image.src.startsWith('/images/') ? image.src : `/images/${image.src.replace(/^\/+/, '')}`
  return image.imageHash ? `${path}?v=${image.imageHash}` : path
}

function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  return (
    <section className="border-t border-[var(--yeet-border)] pt-[30px] text-base leading-[1.72] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--yeet-pink)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--yeet-gray)] [&_h2]:mb-4 [&_h2]:text-[34px] [&_h2]:font-bold [&_h2]:leading-none [&_h3]:mb-3 [&_h3]:text-[26px] [&_h3]:font-bold [&_h4]:mb-2.5 [&_h4]:text-[13px] [&_h4]:uppercase [&_h4]:text-[var(--yeet-tomato)] [&_hr]:my-7 [&_hr]:border-[var(--yeet-border)] [&_li]:mb-2 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-[22px] [&_p]:mb-5 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-[22px]">
      <Html html={block.html} />
    </section>
  )
}

function ImageBlockView({ block }: { block: ImageBlock }) {
  const columns = block.layout.columns ?? Math.min(Math.max(block.images.length, 1), 3) as 1 | 2 | 3
  const layoutClass =
    block.layout.mode === 'flex'
      ? 'flex flex-wrap gap-4 [&>figure]:min-w-[min(260px,100%)] [&>figure]:flex-1'
      : block.layout.mode === 'grid'
        ? `grid gap-4 ${IMAGE_COLUMNS[columns]}`
        : 'grid grid-cols-1 gap-4'

  return (
    <section className="border-t border-[var(--yeet-border)] pt-[30px]">
      <div className={layoutClass}>
        {block.images.map((image, index) => (
          <figure key={`${image.src}-${index}`} className="m-0">
            <img
              src={blockImageUrl(image)}
              alt={image.alt}
              loading="lazy"
              className="w-full object-cover"
            />
            {image.caption && (
              <Html
                as="figcaption"
                html={image.caption}
                className="mt-2 text-sm leading-relaxed text-[var(--yeet-gray)]/75"
              />
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}

function YouTubeBlockView({ block }: { block: YouTubeBlock }) {
  return (
    <section className="border-t border-[var(--yeet-border)] pt-[30px]">
      <div className="aspect-video overflow-hidden bg-[var(--yeet-light-pink)]">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${block.id}`}
          title={block.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="size-full border-0"
        />
      </div>
    </section>
  )
}

const ACTION_BASE =
  'border-0 shadow-none cursor-pointer uppercase font-[family-name:var(--font-action)] text-[13px] font-bold tracking-[1.95px] hover:bg-[var(--yeet-gray)] hover:text-white hover:shadow-none aria-pressed:bg-[var(--yeet-gray)] aria-pressed:text-white'

const ACTION_VARIANTS = {
  hero:
    'inline-flex items-center justify-center gap-1.5 min-h-8 px-2.5 py-1.5 bg-[var(--yeet-pink)] text-[var(--yeet-gray)] leading-[20.8px] max-[640px]:flex-[1_1_calc(50%-4px)]',
  card:
    'inline-flex items-center justify-center gap-2 min-h-[42px] px-3.5 py-2.5 bg-[var(--yeet-tomato)] text-white leading-[1.25]',
}

type RecipeActionProps = {
  variant: keyof typeof ACTION_VARIANTS
  href?: string
  target?: string
  rel?: string
  pressed?: boolean
  onClick?: () => void
  children: ReactNode
}

export function RecipeAction({
  variant,
  href,
  target,
  rel,
  pressed,
  onClick,
  children,
}: RecipeActionProps) {
  const className = cn(ACTION_BASE, ACTION_VARIANTS[variant])

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={className}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={className}>
      {children}
    </button>
  )
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
          className={`yeet-card-actions grid grid-cols-3 gap-3 mt-6 mb-1 max-[640px]:grid-cols-1 print:hidden ${cookMode ? 'sticky top-3 z-[var(--z-recipe-actions)] bg-white pb-3' : ''}`}
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

export function registerSharedPageBlocks(registry: PageBlockRegistry<RecipePageBlockContext>) {
  return registry
    .register('markdown', ({ block }) => <MarkdownBlockView block={block} />)
    .register('image', ({ block }) => <ImageBlockView block={block} />)
    .register('recipe', ({ block, index, context }) => <RecipeBlockView block={block} index={index} context={context} />)
    .register('youtube', ({ block }) => <YouTubeBlockView block={block} />)
}

export function createSharedPageBlockRegistry() {
  return registerSharedPageBlocks(createPageBlockRegistry<RecipePageBlockContext>())
}

export function PageBlocks<TContext>({
  blocks,
  registry,
  context,
}: {
  blocks: PageBlock[]
  registry: PageBlockRegistry<TContext>
  context: TContext
}) {
  return (
    <>
      {blocks.map((block, index) => {
        const renderer = registry.resolve(block)
        if (!renderer) {
          throw new Error(`No page block renderer registered for "${block.type}"`)
        }
        return <div key={index}>{renderer({ block, index, context })}</div>
      })}
    </>
  )
}
