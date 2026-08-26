import type { ReactNode } from 'react'

import { cn } from '@eat-yeet/l0-foundation/utils'
import type { PageBlock } from '@eat-yeet/l4-content-model/blocks'
import { PageBlocks, type PageBlockRegistry } from './page-blocks'

export type ContentPageArticleProps<TContext> = {
  blocks: PageBlock[]
  blockRegistry: PageBlockRegistry<TContext>
  blockContext: TContext
  header?: ReactNode
  media?: ReactNode
  aside?: ReactNode
  articleLabel?: string
  rootAttributes?: Record<`data-${string}`, string | undefined>
  className?: string
  headerClassName?: string
  mediaClassName?: string
  mainClassName?: string
  articleClassName?: string
}

export function ContentPageArticle<TContext>({
  blocks,
  blockRegistry,
  blockContext,
  header,
  media,
  aside,
  articleLabel,
  rootAttributes,
  className,
  headerClassName,
  mediaClassName,
  mainClassName,
  articleClassName,
}: ContentPageArticleProps<TContext>) {
  const hasAside = Boolean(aside)

  return (
    <div
      {...rootAttributes}
      className={cn('yeet bg-white text-[var(--yeet-gray)] text-base leading-[1.6]', className)}
    >
      {header && (
        <header
          className={cn(
            'block max-w-[1120px] mx-auto px-7 pt-24 pb-7 max-[640px]:px-[18px] max-[640px]:pt-[42px] max-[640px]:pb-[18px] print:hidden',
            headerClassName,
          )}
        >
          {header}
        </header>
      )}

      {media && (
        <figure
          className={cn('max-w-[1120px] mt-2.5 mx-auto px-7 max-[640px]:px-[18px] print:hidden', mediaClassName)}
        >
          {media}
        </figure>
      )}

      <main
        className={cn(
          'relative grid items-start mx-auto px-7 pb-[72px] pt-[58px] max-[640px]:px-[18px] max-[640px]:pb-[56px] max-[640px]:pt-[34px] print:max-w-none print:p-0',
          hasAside
            ? 'grid-cols-[minmax(0,760px)_300px] gap-14 max-w-[1120px] max-[1080px]:block max-[1080px]:max-w-[760px]'
            : 'grid-cols-1 max-w-[1120px]',
          mainClassName,
        )}
      >
        <article
          className={cn(
            'mt-12 print:m-0 print:border-0 print:shadow-none print:p-0',
            hasAside ? 'max-w-[760px]' : 'max-w-none',
            articleClassName,
          )}
          aria-label={articleLabel}
        >
          <PageBlocks blocks={blocks} registry={blockRegistry} context={blockContext} />
        </article>
        {aside}
      </main>
    </div>
  )
}
