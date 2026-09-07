import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Printer, Share2 } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { CookModeSwitch, RecipeAction } from './recipe-actions'
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

export function RecipeArticleHeader({
  page,
  pinUrl,
  printPage,
  focusedCooking,
  toggleFocusedCooking,
}: {
  page: Pick<RecipeContent, 'title' | 'description'>
  pinUrl: URL
  printPage: () => void
  focusedCooking: boolean
  toggleFocusedCooking: () => void
}) {
  return (
    <div className="@container">
      <nav className="flex flex-wrap gap-1.5 mb-5 text-[var(--color-ink)] text-xs leading-[1.6] uppercase print:hidden" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>&gt;</span>
        <a href="/recipes">Recipes</a>
        <span>&gt;</span>
        <span>{page.title}</span>
      </nav>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
        <h1 className="col-span-2 m-0 min-w-0 max-w-[var(--layout-recipe-copy)] text-[34px] leading-[1.25] tracking-[1.2px] font-bold @min-[52rem]:col-span-1">{page.title}</h1>
        <div className="col-start-1 row-start-2 self-center text-xs uppercase text-[var(--color-primary)]">By Patrick Hogan</div>
        <div className="col-start-2 row-start-2 self-center justify-self-end @min-[52rem]:row-span-2 @min-[52rem]:row-start-1 print:hidden"><CookModeSwitch variant="hero" label="Cooking view" checked={focusedCooking} onCheckedChange={toggleFocusedCooking} /></div>
      </div>
      <div className="mb-6 mt-4 flex flex-wrap gap-3 print:hidden" role="group" aria-label="Page actions">
        <RecipeAction variant="hero" href={pinUrl.toString()} target="_blank" rel="noreferrer">
          <Share2 className="size-3.5" />
          Pin Recipe
        </RecipeAction>
        <RecipeAction variant="hero" onClick={printPage}>
          <Printer className="size-3.5" />
          Print Recipe
        </RecipeAction>
      </div>
      {page.description && <p className="max-w-[var(--layout-recipe-copy)] m-0 text-base leading-[1.625]">{page.description}</p>}
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
    firstRecipeBlockIndex,
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
      headerClassName={cn(focusedCooking && 'pb-0', 'print:block print:px-0 print:pt-0 print:pb-6')}
      header={(
        <RecipeArticleHeader
          page={page}
          pinUrl={pinUrl}
          printPage={printPage}
          focusedCooking={focusedCooking}
          toggleFocusedCooking={toggleFocusedCooking}
        />
      )}
      media={photo ? <img src={photo} alt={heroAlt} className="w-full max-h-[690px] rounded-surface object-cover" /> : undefined}
      mediaClassName={focusedCooking ? 'hidden' : undefined}
      mainClassName={cn(
        'pt-8 max-[640px]:pt-6 max-[1080px]:max-w-[1120px]',
        aside && 'grid-cols-[minmax(0,760px)_300px] gap-14 max-[1080px]:block',
        focusedCooking && 'pt-6',
      )}
      articleClassName={cn(
        'mt-0 max-w-[var(--layout-recipe-copy)] bg-white pt-0 pb-[38px] max-[640px]:pb-[30px]',
        focusedCooking && 'shadow-none',
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
