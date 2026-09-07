import { useEffect, useRef, useState, type ReactNode } from 'react'

import { CookingPot, Printer, Share2 } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { RecipeAction } from './recipe-actions'
import type { RecipePageBlockContext } from './recipe-blocks'
import { RecipeWorkbenchHost } from './recipe-workbench'
import type { ActiveRecipeWorkbench } from './workbench-registry'

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
  focusedCooking: boolean
}

function RecipeArticleHeader({
  page,
  pinUrl,
  printPage,
  focusedCooking,
  toggleFocusedCooking,
}: {
  page: RecipeContent
  pinUrl: URL
  printPage: () => void
  focusedCooking: boolean
  toggleFocusedCooking: () => void
}) {
  return (
    <div className="max-w-[690px]">
      <nav className="yeet-crumbs flex flex-wrap gap-1.5 mb-5 text-[var(--yeet-gray)] text-xs leading-[1.6] uppercase" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>&gt;</span>
        <a href="/recipes">Recipes</a>
        <span>&gt;</span>
        <span>{page.title}</span>
      </nav>
      <h1 className="m-0 max-w-[690px] text-[34px] leading-[1.25] tracking-[1.2px] font-bold">{page.title}</h1>
      <div className="yeet-byline mt-2 text-xs uppercase text-[var(--yeet-tomato)]">By Patrick Hogan</div>
      <div className="flex flex-wrap gap-1 mt-7 mb-7" aria-label="Page actions">
        <RecipeAction variant="hero" href={pinUrl.toString()} target="_blank" rel="noreferrer">
          <Share2 className="size-3 max-[640px]:hidden" />
          Pin Recipe
        </RecipeAction>
        <RecipeAction variant="hero" onClick={printPage}>
          <Printer className="size-3 max-[640px]:hidden" />
          Print Recipe
        </RecipeAction>
        <RecipeAction variant="hero" onClick={toggleFocusedCooking}>
          <CookingPot className="size-3 max-[640px]:hidden" />
          {focusedCooking ? 'Back to Recipe' : 'Start Cooking'}
        </RecipeAction>
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
  workbench,
  onWorkbenchApply,
  storageScope = 'eat-yeet',
}: {
  page: RecipeContent
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
  aside?: (props: RecipeArticleAsideProps) => ReactNode
  workbench?: ActiveRecipeWorkbench | null
  onWorkbenchApply?: (state: unknown) => void
  storageScope?: string
}) {
  const [cookMode, setCookMode] = useState(false)
  const [focusedCooking, setFocusedCooking] = useState(false)
  const [workbenchOpen, setWorkbenchOpen] = useState(false)
  const workbenchTriggerRef = useRef<HTMLElement | null>(null)
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null)
  const photo = imageUrl(page)
  const heroAlt = `${page.title} hero image`
  const pageUrl = typeof window === 'undefined' ? `${siteUrl}/recipes/${page.slug}` : window.location.href
  const pinUrl = new URL('https://www.pinterest.com/pin/create/button/')
  const firstRecipeBlockIndex = page.blocks.findIndex((block) => block.type === 'recipe')
  const hasRecipeBlock = firstRecipeBlockIndex >= 0
  const printPage = () => {
    window.print()
  }
  const toggleCookMode = () => {
    setCookMode((active) => {
      if (active) setFocusedCooking(false)
      return !active
    })
  }
  const toggleFocusedCooking = () => {
    setFocusedCooking((active) => {
      setCookMode(!active)
      return !active
    })
  }
  const openWorkbench = () => {
    workbenchTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setWorkbenchOpen(true)
  }
  const changeWorkbenchOpen = (open: boolean) => {
    setWorkbenchOpen(open)
    if (!open) requestAnimationFrame(() => workbenchTriggerRef.current?.focus())
  }

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
    workbenchSummary: workbench ? workbench.plugin.summary(page, workbench.config, workbench.state) : undefined,
    onOpenWorkbench: workbench ? openWorkbench : undefined,
  }

  return (
    <>
    <ContentPageArticle
      blocks={page.blocks}
      blockRegistry={blockRegistry}
      blockContext={blockContext}
      articleLabel={`${page.title} page content`}
      rootAttributes={{
        'data-cook-mode': cookMode ? 'true' : undefined,
        'data-focused-cooking': focusedCooking ? 'true' : undefined,
      }}
      headerClassName={focusedCooking ? 'max-w-[760px] pb-0' : undefined}
      header={(
        <RecipeArticleHeader
          page={page}
          pinUrl={pinUrl}
          printPage={printPage}
          focusedCooking={focusedCooking}
          toggleFocusedCooking={toggleFocusedCooking}
        />
      )}
      media={photo ? <img src={photo} alt={heroAlt} className="w-full max-h-[690px] object-cover" /> : undefined}
      mediaClassName={focusedCooking ? 'hidden' : undefined}
      mainClassName={focusedCooking ? 'grid-cols-1 max-w-[816px] pt-6' : undefined}
      articleClassName={cn(
        'yeet-card bg-white border-2 border-[var(--yeet-gray)] px-9 pb-[38px] pt-[34px] shadow-[18px_18px_0_var(--yeet-pink)] max-[900px]:shadow-[10px_10px_0_var(--yeet-pink)] max-[640px]:px-[22px] max-[640px]:pb-[30px] max-[640px]:pt-[26px]',
        focusedCooking && 'mt-0 shadow-none',
      )}
      aside={aside?.({ page, focusedCooking })}
    />
    {workbench && onWorkbenchApply && (
      <RecipeWorkbenchHost
        recipe={page}
        workbench={workbench}
        onApply={onWorkbenchApply}
        storageScope={storageScope}
        open={workbenchOpen}
        onOpenChange={changeWorkbenchOpen}
      />
    )}
    </>
  )
}
