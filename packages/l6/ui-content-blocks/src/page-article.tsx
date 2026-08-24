import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Book, Printer, Share2, Star } from 'lucide-react'
import { labelize } from '@eat-yeet/l2-recipe-domain/format'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { PageBlocks, RecipeAction, type PageBlockRegistry, type RecipePageBlockContext } from './page-blocks'

type ScreenWakeLockSentinel = {
  released?: boolean
  release: () => Promise<void>
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<ScreenWakeLockSentinel>
  }
}

type PageAsideProps = {
  page: RecipeContent
  cookMode: boolean
}

export function ContentPageArticle({
  page,
  siteUrl,
  blockRegistry,
  aside,
}: {
  page: RecipeContent
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
  aside?: (props: PageAsideProps) => ReactNode
}) {
  const [cookMode, setCookMode] = useState(false)
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null)
  const photo = imageUrl(page)
  const category = page.category ? labelize(page.category) : 'Recipe'
  const courses = page.courses.map(labelize).join(' / ')
  const heroAlt = `${page.title} hero image`
  const crumbCourse = page.courses[0] ? labelize(page.courses[0]) : category
  const pageUrl = `${siteUrl}/recipes/${page.slug}`
  const pinUrl = new URL('https://www.pinterest.com/pin/create/button/')
  const firstRecipeBlockIndex = page.blocks.findIndex((block) => block.type === 'recipe')
  const hasRecipeBlock = firstRecipeBlockIndex >= 0
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

  const printPage = () => {
    window.print()
  }

  const blockContext: RecipePageBlockContext = {
    page,
    siteUrl,
    cookMode,
    firstRecipeBlockIndex,
    printPage,
    pinUrl,
    onToggleCookMode: () => setCookMode((active) => !active),
  }

  return (
    <div className={`yeet bg-white text-[var(--yeet-gray)] text-base leading-[1.6] ${cookMode ? 'yeet-cook' : ''}`}>
      <header
        className={`block max-w-[1120px] mx-auto px-7 pt-24 pb-7 max-[640px]:px-[18px] max-[640px]:pt-[42px] max-[640px]:pb-[18px] print:hidden ${cookMode ? 'max-w-[760px] pb-0' : ''}`}
      >
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
              onClick={() => setCookMode((active) => !active)}
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
      </header>

      {photo && (
        <figure
          className={`max-w-[1120px] mt-2.5 mx-auto px-7 max-[640px]:px-[18px] print:hidden ${cookMode ? 'hidden' : ''}`}
        >
          <img src={photo} alt={heroAlt} className="w-full max-h-[690px] object-cover" />
        </figure>
      )}

      <main
        className={`relative grid grid-cols-[minmax(0,760px)_300px] items-start gap-14 max-w-[1120px] mx-auto px-7 pb-[72px] max-[1080px]:block max-[1080px]:max-w-[760px] max-[640px]:px-[18px] max-[640px]:pb-[56px] print:max-w-none print:p-0 ${cookMode ? 'pt-6' : 'pt-[58px] max-[640px]:pt-[34px]'}`}
      >
        <article
          className={`yeet-card mt-12 max-w-[760px] bg-white border-2 border-[var(--yeet-gray)] px-9 pb-[38px] shadow-[18px_18px_0_var(--yeet-pink)] max-[900px]:shadow-[10px_10px_0_var(--yeet-pink)] max-[640px]:px-[22px] max-[640px]:pb-[30px] print:m-0 print:border-0 print:shadow-none print:p-0 ${cookMode ? 'mt-0 shadow-none' : 'pt-[34px] max-[640px]:pt-[26px]'}`}
          aria-label={`${page.title} page content`}
        >
          <PageBlocks blocks={page.blocks} registry={blockRegistry} context={blockContext} />
        </article>
        {aside?.({ page, cookMode })}
      </main>
    </div>
  )
}
