import { BookOpen, SlidersHorizontal, Thermometer, UtensilsCrossed } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { articleImageUrl, type ArticleSummary } from '@eat-yeet/l1-article-model/articles'
import { labelize } from '@eat-yeet/l2-recipe-domain/format'
import type { PageBlock } from '@eat-yeet/l4-content-model/blocks'
import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'
import { ArticleCard } from '@eat-yeet/l6-ui-catalog/cards'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import { createSharedPageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'

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

const CATEGORY_ICONS = {
  dough: SlidersHorizontal,
  sourdough: BookOpen,
  pizza: UtensilsCrossed,
  temperature: Thermometer,
} as const

function categoryLabel(category: string) {
  return category ? labelize(category) : 'Learning'
}

function ArticleGroup({ category, articles }: { category: string; articles: ArticleSummary[] }) {
  const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] ?? BookOpen

  return (
    <section className="border-t border-border-light pt-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-tint text-brand-strong">
          <Icon className="size-5" />
        </div>
        <h2 className="font-display text-[28px] font-extrabold leading-tight text-ink">
          {categoryLabel(category)}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
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
        <h1 className="font-display text-[clamp(34px,5vw,56px)] font-extrabold leading-none text-ink">
          {copy.pages.learnHeading}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/65">
          {copy.pages.learnIntro}
        </p>
      </div>

      {articles.length === 0 ? (
        <section className="border-t border-border-light py-16">
          <p className="text-lg text-ink/65">No learning articles are available yet.</p>
        </section>
      ) : (
        <div className="grid gap-12">
          {[...grouped.entries()].map(([category, group]) => (
            <ArticleGroup key={category} category={category} articles={group} />
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
    <div className="mb-[22px] text-center font-[family-name:var(--yeet-serif)] text-[36px] font-bold leading-[1.05] tracking-[0.8px] text-[var(--yeet-gray)]">
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
    <section className="mt-14 border-t border-[var(--yeet-border)] pt-8 min-[1081px]:hidden" aria-label="More to learn">
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
        <nav className="yeet-crumbs mb-5 flex flex-wrap gap-1.5 text-xs uppercase leading-[1.6] text-[var(--yeet-gray)]" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>&gt;</span>
          <a href="/learn">Learn</a>
          <span>&gt;</span>
          <span>{categoryLabel(article.category)}</span>
        </nav>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[2px] text-[var(--yeet-tomato)]">
          {ARTICLE_TYPE_LABELS[article.type]}
        </p>
        <h1 className="m-0 max-w-[560px] text-[46px] font-bold leading-[1.08] max-[640px]:text-[32px]">
          {article.title}
        </h1>
        {article.description && (
          <p className="mt-5 max-w-[560px] text-xl leading-[1.45] text-[var(--yeet-gray)]/80 max-[640px]:text-lg">
            {article.description}
          </p>
        )}
      </div>

      {photo && (
        <figure className="m-0 max-[900px]:order-first max-[900px]:mb-2">
          <img
            src={photo}
            alt={`${article.title} hero image`}
            className="aspect-[3/2] w-full max-h-[520px] object-cover max-[900px]:max-h-none"
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
        '!m-0 !border-0 !bg-transparent !p-0 !shadow-none text-lg leading-[1.72] max-[1080px]:mx-auto max-[640px]:text-[17px] [&_section]:!text-lg [&_section]:!leading-[1.72] max-[640px]:[&_section]:!text-[17px] [&>div>section]:!border-t-0 [&>div:first-child>section]:pt-0',
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
