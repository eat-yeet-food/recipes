import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Book, Printer, Share2, Star } from 'lucide-react'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { labelize } from '@eat-yeet/l2-recipe-domain/format'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { RecipeAction } from './recipe-actions'
import type { RecipePageBlockContext } from './recipe-blocks'

type ScreenWakeLockSentinel = {
  released?: boolean
  release: () => Promise<void>
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<ScreenWakeLockSentinel>
  }
}

type RecipeArticleAsideProps = {
  page: RecipeContent
  cookMode: boolean
}

function RecipeArticleHeader({
  page,
  cookMode,
  pinUrl,
  printPage,
  onToggleCookMode,
  hasRecipeBlock,
}: {
  page: RecipeContent
  cookMode: boolean
  pinUrl: URL
  printPage: () => void
  onToggleCookMode: () => void
  hasRecipeBlock: boolean
}) {
  const category = page.category ? labelize(page.category) : 'Recipe'
  const courses = page.courses.map(labelize).join(' / ')
  const crumbCourse = page.courses[0] ? labelize(page.courses[0]) : category

  return (
    <div className="max-w-[690px]">
      <nav className="yeet-crumbs flex flex-wrap gap-1.5 mb-5 text-[var(--yeet-gray)] text-xs leading-[1.6] uppercase" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>&gt;</span>
        <a href="/search">Recipes</a>
        <span>&gt;</span>
        <span>{crumbCourse}</span>
        <span>&gt;</span>
        <span>{page.title}</span>
      </nav>
      <h1 className="m-0 max-w-[690px] text-[34px] leading-[1.25] tracking-[1.2px] font-bold">{page.title}</h1>
      <div className="yeet-byline flex flex-wrap gap-x-[22px] gap-y-2.5 mt-2 text-[var(--yeet-tomato)] text-xs uppercase">
        <span>By Patrick Hogan</span>
        {courses && (
          <span className="relative before:absolute before:-left-3 before:top-[0.45em] before:size-1 before:rounded-full before:bg-[var(--yeet-tomato)] before:content-['']">
            {courses}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-3.5 mb-7 text-[var(--yeet-pink)]" role="img" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className="size-[22px]" strokeWidth={0} fill="currentColor" />
        ))}
      </div>
      <div className="yeet-actions flex flex-wrap gap-1 mb-7" aria-label="Page actions">
        <RecipeAction variant="hero" href={pinUrl.toString()} target="_blank" rel="noreferrer">
          <Share2 className="size-3 max-[640px]:hidden" />
          Pin Recipe
        </RecipeAction>
        <RecipeAction variant="hero" onClick={printPage}>
          <Printer className="size-3 max-[640px]:hidden" />
          Print Recipe
        </RecipeAction>
        <RecipeAction
          variant="hero"
          pressed={cookMode}
          onClick={onToggleCookMode}
        >
          <Book className="size-3 max-[640px]:hidden" />
          Cook Mode
        </RecipeAction>
        {hasRecipeBlock && (
          <RecipeAction variant="hero" href="#recipe-card">
            Jump to Recipe
          </RecipeAction>
        )}
      </div>
      {page.description && <p className="max-w-[690px] m-0 text-base leading-[1.625]">{page.description}</p>}
    </div>
  )
}

export function RecipeArticle({
  page,
  siteUrl,
  blockRegistry,
  aside,
}: {
  page: RecipeContent
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
  aside?: (props: RecipeArticleAsideProps) => ReactNode
}) {
  const [cookMode, setCookMode] = useState(false)
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null)
  const photo = imageUrl(page)
  const heroAlt = `${page.title} hero image`
  const pageUrl = `${siteUrl}/recipes/${page.slug}`
  const pinUrl = new URL('https://www.pinterest.com/pin/create/button/')
  const firstRecipeBlockIndex = page.blocks.findIndex((block) => block.type === 'recipe')
  const hasRecipeBlock = firstRecipeBlockIndex >= 0
  const printPage = () => {
    window.print()
  }
  const toggleCookMode = () => setCookMode((active) => !active)

  pinUrl.searchParams.set('url', pageUrl)
  pinUrl.searchParams.set('description', page.title)
  if (photo) pinUrl.searchParams.set('media', `${siteUrl}${photo}`)

  useEffect(() => {
    if (!cookMode) return

    let cancelled = false

    async function requestWakeLock() {
      const wakeLock = (navigator as WakeLockNavigator).wakeLock
      if (!wakeLock || document.visibilityState !== 'visible') return

      try {
        wakeLockRef.current = await wakeLock.request('screen')
        if (cancelled) {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
        }
      } catch {
        wakeLockRef.current = null
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === 'visible' &&
        (!wakeLockRef.current || wakeLockRef.current.released)
      ) {
        void requestWakeLock()
      }
    }

    void requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      const wakeLock = wakeLockRef.current
      wakeLockRef.current = null
      void wakeLock?.release().catch(() => {})
    }
  }, [cookMode])

  const blockContext: RecipePageBlockContext = {
    page,
    siteUrl,
    cookMode,
    firstRecipeBlockIndex,
    printPage,
    pinUrl,
    onToggleCookMode: toggleCookMode,
  }

  return (
    <ContentPageArticle
      blocks={page.blocks}
      blockRegistry={blockRegistry}
      blockContext={blockContext}
      articleLabel={`${page.title} page content`}
      rootAttributes={{ 'data-cook-mode': cookMode ? 'true' : undefined }}
      headerClassName={cookMode ? 'max-w-[760px] pb-0' : undefined}
      header={(
        <RecipeArticleHeader
          page={page}
          cookMode={cookMode}
          pinUrl={pinUrl}
          printPage={printPage}
          onToggleCookMode={toggleCookMode}
          hasRecipeBlock={hasRecipeBlock}
        />
      )}
      media={photo ? <img src={photo} alt={heroAlt} className="w-full max-h-[690px] object-cover" /> : undefined}
      mediaClassName={cookMode ? 'hidden' : undefined}
      mainClassName={cookMode ? 'pt-6' : undefined}
      articleClassName={cookMode ? 'mt-0 shadow-none' : undefined}
      aside={aside?.({ page, cookMode })}
    />
  )
}
