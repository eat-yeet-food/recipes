'use client'
import { ResponsiveImage } from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { articleImageUrl, type ArticleSummary } from '@eat-yeet/l1-article-model/articles'
import { labelize } from '@eat-yeet/l2-recipe-domain/format'
import type { PageBlock } from '@eat-yeet/l4-content-model/blocks'
import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'
import { ArticleCard } from '@eat-yeet/l6-ui-catalog/cards'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import { createSharedPageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { Breadcrumbs } from '@eat-yeet/l5-ui-primitives/primitives/breadcrumbs'
import { Eyebrow, PageTitle, SectionTitle } from '@eat-yeet/l5-ui-primitives/primitives/typography'

type LearnCopy = {
  pages: {
    learnHeading: string
    learnIntro: string
  }
}

const ARTICLE_TYPE_LABELS = {
  guide: 'Guide',
  technique: 'Technique',
  reference: 'Reference',
} satisfies Record<ArticleSummary['type'], string>

function categoryLabel(category: string) {
  return category ? labelize(category) : 'Learning'
}

function ArticleGroup({ category, articles, priority=false }: { category: string; articles: ArticleSummary[]; priority?:boolean }) {
  return (
    <section>
      <SectionTitle size="title" rule="trailing" className="mb-6">{categoryLabel(category)}</SectionTitle>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article,index) => (
          <ArticleCard key={article.slug} article={article} priority={priority&&index===0} />
        ))}
      </div>
    </section>
  )
}

export function LearnIndexPage({ articles, copy }: { articles: ArticleSummary[]; copy: LearnCopy }) {
  const grouped = new Map<string, ArticleSummary[]>()
  for (const article of articles) {
    const key = article.category || 'learning'
    grouped.set(key, [...(grouped.get(key) ?? []), article])
  }

  return (
    <div className="mx-auto max-w-[var(--max-width)] px-6 pb-20 pt-8 md:px-8">
      <div className="mb-10">
        <PageTitle>{copy.pages.learnHeading}</PageTitle>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {copy.pages.learnIntro}
        </p>
      </div>

      {articles.length === 0 ? (
        <section className="border-t border-border py-16">
          <p className="text-lg text-muted-foreground">No learning articles are available yet.</p>
        </section>
      ) : (
        <div className="grid gap-12">
          {[...grouped.entries()].map(([category, group],index) => (
            <ArticleGroup key={category} category={category} articles={group} priority={index===0} />
          ))}
        </div>
      )}
    </div>
  )
}

const articleBlockRegistry = createSharedPageBlockRegistry<unknown>()

function MoreLearnSection({
  articles,
  placement,
}: {
  articles: ArticleSummary[]
  placement: 'sidebar' | 'below'
}) {
  if (articles.length === 0) return null

  const heading = (
    <div className="mb-[22px] text-center font-display text-page font-bold leading-[1.05] text-ink">
      <span role="heading" aria-level={2}>
        Learn More
      </span>
    </div>
  )

  if (placement === 'sidebar') {
    return (
      <aside className="sticky top-24 hidden min-[1081px]:block" aria-label="More to learn">
        {heading}
        <div className="grid gap-[26px]">
          {articles.map((candidate) => (
            <ArticleCard key={candidate.slug} article={candidate} />
          ))}
        </div>
      </aside>
    )
  }

  return (
    <section className="mt-14 border-t border-border pt-8 min-[1081px]:hidden" aria-label="More to learn">
      {heading}
      <div className="grid gap-8 sm:grid-cols-2">
        {articles.map((candidate) => (
          <ArticleCard key={candidate.slug} article={candidate} />
        ))}
      </div>
    </section>
  )
}

function articleBlocksWithoutDuplicateHero(article: ArticleContent): PageBlock[] {
  if (!article.image) return article.blocks
  const duplicateIndex = article.blocks.findIndex((block) =>
    block.type === 'image' &&
    block.images.length === 1 &&
    block.images[0]?.src.replace(/^\/?images\//, '') === article.image,
  )

  return duplicateIndex === -1
    ? article.blocks
    : article.blocks.filter((_, index) => index !== duplicateIndex)
}

export function ArticleDetailPage({
  article,
  articles,
}: {
  article: ArticleContent
  articles: ArticleSummary[]
}) {
  const photo = articleImageUrl(article)
  const articleBlocks = articleBlocksWithoutDuplicateHero(article)
  const related = articles.filter((candidate) => candidate.slug !== article.slug).slice(0, 3)
  const hasRelated = related.length > 0
  const header = (
    <div
      className={cn(
        'grid items-start gap-14 min-[901px]:grid-cols-[minmax(0,515px)_minmax(520px,1fr)]',
        !photo && 'min-[901px]:grid-cols-[minmax(0,760px)]',
      )}
    >
      <div className="min-[901px]:pt-10 max-[900px]:px-8 max-[640px]:px-[15px]">
        <Breadcrumbs className="mb-5" crumbs={[{ label: 'Home', href: '/' }, { label: 'Learn', href: '/learn' }, { label: categoryLabel(article.category) }]} />
        <Eyebrow className="mb-4">{ARTICLE_TYPE_LABELS[article.type]}</Eyebrow>
        <PageTitle className="max-w-[560px]">{article.title}</PageTitle>
        {article.description && (
          <p className="mt-5 max-w-[560px] text-xl leading-[1.45] text-ink max-[640px]:text-lg">
            {article.description}
          </p>
        )}
      </div>

      {photo && (
        <figure className="m-0 max-[900px]:order-first max-[900px]:mb-2">
          <ResponsiveImage
            src={photo} loading="eager" fetchPriority="high"
            alt={`${article.title} hero image`}
            className="aspect-[3/2] w-full max-h-[520px] rounded-surface object-cover max-[900px]:max-h-none"
          />
        </figure>
      )}
    </div>
  )

  return (
    <ContentPageArticle
      blocks={articleBlocks}
      blockRegistry={articleBlockRegistry}
      blockContext={{}}
      articleLabel={`${article.title} article content`}
      className="bg-white"
      header={header}
      headerClassName="!max-w-[1240px] !px-8 !pb-10 !pt-12 max-[900px]:!px-0 max-[900px]:!pt-0 max-[640px]:!pb-8"
      mainClassName={cn(
        '!max-w-[1240px] !px-8 !pb-24 !pt-6 max-[1080px]:!block max-[1080px]:!max-w-none max-[640px]:!px-[15px] max-[640px]:!pb-16 max-[640px]:!pt-2',
        hasRelated ? 'grid-cols-[minmax(0,770px)_280px] gap-20' : '!grid-cols-1',
      )}
      articleClassName={cn(
        '!m-0 !border-0 !bg-transparent !p-0 !shadow-none text-lg leading-[1.72] max-[1080px]:mx-auto max-[640px]:text-lg [&_section]:!text-lg [&_section]:!leading-[1.72] max-[640px]:[&_section]:!text-lg',
        hasRelated ? '!max-w-[770px]' : '!max-w-none',
      )}
      aside={hasRelated ? (
        <>
          <MoreLearnSection articles={related} placement="sidebar" />
          <MoreLearnSection articles={related} placement="below" />
        </>
      ) : undefined}
    />
  )
}
