import type { ReactNode } from 'react'

import type { ImageBlock, MarkdownBlock, PageBlock, YouTubeBlock } from '@eat-yeet/l4-content-model/blocks'

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

export function registerSharedPageBlocks<TContext>(registry: PageBlockRegistry<TContext>) {
  return registry
    .register('markdown', ({ block }) => <MarkdownBlockView block={block} />)
    .register('image', ({ block }) => <ImageBlockView block={block} />)
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
        return <div key={index}>{renderer({ block, index, context })}</div>
      })}
    </>
  )
}
