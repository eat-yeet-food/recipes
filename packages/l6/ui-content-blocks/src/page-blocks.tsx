import type { ReactNode } from 'react'

import type {
  CalloutBlock,
  ComparisonBlock,
  ImageBlock,
  MarkdownBlock,
  PageBlock,
  SectionBlock,
  StepsBlock,
  YouTubeBlock,
} from '@eat-yeet/l4-content-model/blocks'

const Html = ({ as: Tag = 'div', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />
)

function unwrapSingleParagraph(html: string) {
  const trimmed = html.trim()
  if (!trimmed.startsWith('<p>') || !trimmed.endsWith('</p>')) return null

  const inner = trimmed.slice(3, -4)
  return inner.includes('<p>') || inner.includes('</p>') ? null : inner
}

export type PageBlockRenderer<TBlock extends PageBlock, TContext> = (props: {
  block: TBlock
  index: number
  context: TContext
  registry: PageBlockRegistry<TContext>
}) => ReactNode

export interface PageBlockRegistry<TContext> {
  register<TType extends PageBlock['type']>(
    type: TType,
    renderer: PageBlockRenderer<Extract<PageBlock, { type: TType }>, TContext>,
  ): PageBlockRegistry<TContext>
  resolve(block: PageBlock): PageBlockRenderer<PageBlock, TContext> | undefined
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

const IMAGE_ASPECT_CLASSES = {
  landscape: 'aspect-[4/3]',
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
} satisfies Record<'landscape' | 'square' | 'portrait', string>

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
  const aspect = block.layout.aspect ?? (block.layout.mode === 'grid' ? 'landscape' : 'natural')
  const aspectClass = aspect === 'natural' ? '' : IMAGE_ASPECT_CLASSES[aspect]
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
          <figure key={`${image.src}-${index}`} className="m-0 h-full">
            <div className={aspectClass ? 'overflow-hidden bg-[var(--yeet-light-pink)]' : undefined}>
              <img
                src={blockImageUrl(image)}
                alt={image.alt}
                loading="lazy"
                className={`w-full object-cover ${aspectClass}`}
              />
            </div>
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

function SectionBlockView<TContext>({
  block,
  registry,
  context,
}: {
  block: SectionBlock
  registry: PageBlockRegistry<TContext>
  context: TContext
}) {
  const layoutClass =
    block.layout === 'split'
      ? 'grid gap-9 min-[760px]:grid-cols-2 min-[760px]:items-start'
      : block.layout === 'feature'
        ? 'grid gap-10 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] min-[900px]:items-start'
        : 'grid gap-7'

  return (
    <section className="border-t border-[var(--yeet-border)] pt-[30px]">
      <div className={layoutClass}>
        {block.columns.map((column, index) => (
          <div
            key={index}
            className="[&>div:first-child>section]:border-t-0 [&>div:first-child>section]:pt-0"
          >
            <PageBlocks blocks={column.blocks} registry={registry} context={context} />
          </div>
        ))}
      </div>
    </section>
  )
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
  const toneClass =
    block.tone === 'warning'
      ? 'border-[var(--yeet-tomato)] bg-[var(--yeet-light-pink)]'
      : block.tone === 'tip'
        ? 'border-[var(--color-support)] bg-[var(--color-muted)]'
        : 'border-[var(--yeet-border)] bg-[var(--yeet-light-pink)]'

  return (
    <section className="border-t border-[var(--yeet-border)] pt-[30px]">
      <div className={`border-l-4 px-5 py-4 ${toneClass}`}>
        {block.title && (
          <h3 className="mb-2 text-[22px] font-bold leading-tight text-[var(--yeet-gray)]">
            {block.title}
          </h3>
        )}
        {block.html && (
          <Html
            html={block.html}
            className="text-base leading-relaxed text-[var(--yeet-gray)] [&_p]:mb-3 [&_p:last-child]:mb-0"
          />
        )}
      </div>
    </section>
  )
}

function StepsBlockView({ block }: { block: StepsBlock }) {
  const Heading = block.headingLevel === 3 ? 'h3' : 'h2'
  const headingClass =
    block.headingLevel === 3
      ? 'mb-5 text-[26px] font-bold leading-tight text-[var(--yeet-gray)]'
      : 'mb-5 text-[34px] font-bold leading-none text-[var(--yeet-gray)]'

  return (
    <section className="border-t border-[var(--yeet-border)] pt-[30px]">
      {block.title && (
        <Heading className={headingClass}>
          {block.title}
        </Heading>
      )}
      <ol className="grid gap-5 [counter-reset:step]">
        {block.items.map((item, index) => {
          const inlineHtml = unwrapSingleParagraph(item.html)
          const titleSuffix = /[.!?:]$/.test(item.title) ? '' : '.'

          return (
            <li
              key={index}
              className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 [counter-increment:step] before:grid before:size-10 before:place-items-center before:rounded-full before:bg-[var(--yeet-tomato)] before:text-sm before:font-extrabold before:text-white before:content-[counter(step)]"
            >
              <div className="text-base leading-relaxed text-[var(--yeet-gray)]">
                {item.title && inlineHtml !== null ? (
                  <p>
                    <strong className="font-semibold">
                      {item.title}
                      {titleSuffix}
                    </strong>{' '}
                    <Html as="span" html={inlineHtml} />
                  </p>
                ) : (
                  <>
                    {item.title && (
                      <p className="mb-3">
                        <strong className="font-semibold">
                          {item.title}
                          {titleSuffix}
                        </strong>
                      </p>
                    )}
                    <Html
                      html={item.html}
                      className="[&_p]:mb-3 [&_p:last-child]:mb-0"
                    />
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function ComparisonBlockView({ block }: { block: ComparisonBlock }) {
  return (
    <section className="border-t border-[var(--yeet-border)] pt-[30px]">
      {block.title && (
        <h2 className="mb-5 text-[34px] font-bold leading-none text-[var(--yeet-gray)]">
          {block.title}
        </h2>
      )}
      <div className="overflow-x-auto border border-[var(--yeet-border)]">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm leading-relaxed">
          <thead>
            <tr className="bg-[var(--yeet-light-pink)]">
              <th className="border-b border-[var(--yeet-border)] px-4 py-3 font-extrabold text-[var(--yeet-gray)]">
                Factor
              </th>
              {block.columns.map((column) => (
                <th key={column} className="border-b border-[var(--yeet-border)] px-4 py-3 font-extrabold text-[var(--yeet-gray)]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.label} className="border-t border-[var(--yeet-border)] align-top">
                <th className="px-4 py-3 font-extrabold text-[var(--yeet-gray)]">
                  {row.label}
                </th>
                {block.columns.map((column, index) => (
                  <td key={`${row.label}-${column}`} className="px-4 py-3 text-[var(--yeet-gray)]/80">
                    <Html html={row.values[index] ?? ''} className="[&_p]:mb-2 [&_p:last-child]:mb-0" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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

export function registerSharedPageBlocks<TContext>(registry: PageBlockRegistry<TContext>) {
  return registry
    .register('markdown', ({ block }) => <MarkdownBlockView block={block} />)
    .register('image', ({ block }) => <ImageBlockView block={block} />)
    .register('section', ({ block, registry, context }) => (
      <SectionBlockView block={block} registry={registry} context={context} />
    ))
    .register('callout', ({ block }) => <CalloutBlockView block={block} />)
    .register('steps', ({ block }) => <StepsBlockView block={block} />)
    .register('comparison', ({ block }) => <ComparisonBlockView block={block} />)
    .register('youtube', ({ block }) => <YouTubeBlockView block={block} />)
}

export function createSharedPageBlockRegistry<TContext = unknown>() {
  return registerSharedPageBlocks(createPageBlockRegistry<TContext>())
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
        return <div key={index}>{renderer({ block, index, context, registry })}</div>
      })}
    </>
  )
}
