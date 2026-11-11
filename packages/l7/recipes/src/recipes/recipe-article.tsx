'use client'
import { Breadcrumbs } from '@eat-yeet/l5-ui-primitives/primitives/breadcrumbs'
import { Eyebrow, pageTitleClasses } from '@eat-yeet/l5-ui-primitives/primitives/typography'
import { ResponsiveImage } from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'

import { ChefHat, Pencil, Printer } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { ContentPageArticle } from '@eat-yeet/l6-ui-content-blocks/page-article'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import type { RecipeBlock } from '@eat-yeet/l4-content-model/blocks'
import { RecipeAction, RecipeIconAction, CookingViewHint } from './recipe-actions'
import { CookMode, COOK_MODE_QUERY, COOK_MODE_CLASSIC_KEY } from './cook-mode'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import type { RecipePageBlockContext } from './recipe-blocks'
import { RecipeFacts, recipeFactItems, type RecipeFactsSource } from './recipe-facts'

type ScreenWakeLockSentinel = {
  released?: boolean
  release: () => Promise<void>
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<ScreenWakeLockSentinel>
  }
}

export const recipeTitleClass = cn(pageTitleClasses.standard, 'max-w-[var(--layout-recipe-copy)]')

/** Overrides for pages that present a recipe under another title, such as a Notebook bake sheet. */
export type RecipeArticleHeading = {
  crumbs: { label: string; href?: string }[]
  title: string
  byline: ReactNode
  /** Adds an Edit circle after Print and Cooking view, e.g. to edit a Notebook formula. */
  edit?: { href: string; label: string }
}

export function RecipeArticleHeader({
  page,
  heading,
  printPage,
  focusedCooking,
  toggleFocusedCooking,
  stepByStep,
}: {
  page: Pick<RecipeContent, 'title' | 'description'> & RecipeFactsSource
  heading?: RecipeArticleHeading
  printPage: () => void
  focusedCooking: boolean
  toggleFocusedCooking: () => void
  /** On touch devices using the classic Cooking view: switches back to step-by-step cook mode. */
  stepByStep?: () => void
}) {
  const crumbs = heading?.crumbs ?? [{ label: 'Home', href: '/' }, { label: 'Recipes', href: '/recipes' }, { label: page.title }]
  return (
    <div className="@container">
      <Breadcrumbs crumbs={crumbs} className="mb-5 text-brand [&_a]:text-brand [&_a:hover]:text-white" />
      <h1 className={cn('m-0 min-w-0', recipeTitleClass, 'text-white print:text-ink')}>{heading?.title ?? page.title}</h1>
      <div className="mb-6 mt-1.5 flex items-center justify-between gap-4">
        <Eyebrow as="div" size="small" tone="brand" className="print:text-ink">{heading?.byline ?? 'By Patrick Hogan'}</Eyebrow>
        <div className="relative flex shrink-0 gap-2 print:hidden" role="group" aria-label="Page actions">
          <RecipeIconAction label="Print Recipe" tone="on-dark" onClick={printPage}><Printer /></RecipeIconAction>
          <RecipeIconAction label="Cooking view" tone="on-dark" onClick={toggleFocusedCooking} pressed={focusedCooking}><ChefHat /></RecipeIconAction>
          {heading?.edit && <RecipeIconAction label={heading.edit.label} tone="on-dark" href={heading.edit.href}><Pencil /></RecipeIconAction>}
          {/* The hint points at the last circle, so pages with an Edit circle skip it. */}
          {!heading?.edit && <CookingViewHint used={focusedCooking} />}
        </div>
      </div>
      {page.description && <p className="max-w-[var(--layout-recipe-copy)] m-0 text-base leading-[1.625] text-on-dark-label print:text-ink">{page.description}</p>}
      <RecipeFacts items={recipeFactItems(page)} tone="on-dark" className="mt-6" />
      {stepByStep && <Button variant="quiet-on-dark" className="mt-5 print:hidden" onClick={stepByStep}>Switch to step-by-step cook mode</Button>}
    </div>
  )
}

export function RecipeArticle({
  page,
  siteUrl,
  blockRegistry,
  heading,
  beforeIngredients,
  rating,
}: {
  page: RecipeContent
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
  heading?: RecipeArticleHeading
  /** Shown between the recipe facts and Ingredients, such as the Notebook link. */
  beforeIngredients?: ReactNode
  rating?: ReactNode
}) {
  const [cookMode, setCookMode] = useState(false)
  const [focusedCooking, setFocusedCooking] = useState(false)
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null)
  const photo = imageUrl(page)
  const heroAlt = `${page.title} hero image`
  const firstRecipeBlockIndex = page.blocks.findIndex((block) => block.type === 'recipe')
  const hasRecipeBlock = firstRecipeBlockIndex >= 0
  const printPage = () => {
    window.print()
  }
  // Phones and tablets open full-screen cook mode. Exit hides it and keeps your
  // place; finishing the recipe unmounts it so the next open starts fresh.
  const [cookSheet, setCookSheet] = useState<'closed' | 'open' | 'hidden'>('closed')
  const recipeBlocks = page.blocks.filter((block): block is RecipeBlock => block.type === 'recipe')
  const closeCookSheet = () => { setCookSheet('hidden'); setCookMode(false) }
  const finishCookSheet = () => { setCookSheet('closed'); setCookMode(false) }
  const [touch, setTouch] = useState(false)
  useEffect(() => { setTouch(Boolean(recipeBlocks.length && window.matchMedia?.(COOK_MODE_QUERY).matches)) }, [recipeBlocks.length])
  const prefersClassic = () => { try { return localStorage.getItem(COOK_MODE_CLASSIC_KEY) === '1' } catch { return false } }
  const openCookSheet = () => { setFocusedCooking(false); setCookSheet('open'); setCookMode(true) }
  // Classic opt-out from inside cook mode: remembered in this browser.
  const chooseClassic = () => {
    try { localStorage.setItem(COOK_MODE_CLASSIC_KEY, '1') } catch { /* storage blocked: this visit only */ }
    setCookSheet('closed')
    setFocusedCooking(true)
    setCookMode(true)
  }
  const chooseStepByStep = () => {
    try { localStorage.removeItem(COOK_MODE_CLASSIC_KEY) } catch { /* ignore */ }
    openCookSheet()
  }
  const toggleFocusedCooking = () => {
    if (touch && !focusedCooking && !prefersClassic()) {
      openCookSheet()
      return
    }
    setFocusedCooking((active) => {
      setCookMode(!active)
      return !active
    })
  }


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
    beforeIngredients,
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
      heroClassName={cn(
        'print:bg-none',
        photo && !focusedCooking
          ? 'bg-[linear-gradient(var(--color-ink)_calc(100%-min(32vw,300px)),transparent_0)]'
          : 'bg-ink',
      )}
      headerClassName={cn(focusedCooking && 'pb-10 max-[640px]:pb-8', 'print:block print:px-0 print:pt-0 print:pb-6')}
      header={(
        <RecipeArticleHeader
          page={page}
          heading={heading}
          printPage={printPage}
          focusedCooking={focusedCooking}
          toggleFocusedCooking={toggleFocusedCooking}
          stepByStep={touch && focusedCooking ? chooseStepByStep : undefined}
        />
      )}
      media={photo ? <ResponsiveImage src={photo} sizes="(max-width: 640px) calc(100vw - 36px), (max-width: 1120px) calc(100vw - 56px), 1064px" loading="eager" fetchPriority="high" alt={heroAlt} className="w-full max-h-[690px] rounded-surface object-cover shadow-overlay print:shadow-none" /> : undefined}
      mediaClassName={focusedCooking ? 'hidden' : undefined}
      mainClassName={cn(
        'pt-8 max-[640px]:pt-6',
        focusedCooking && 'pt-10 max-[640px]:pt-8',
      )}
      articleClassName={cn(
        // No fill: the page is already white, and a square fill here cut off the photo's shadow behind the first card's rounded corners.
        'mt-0 max-w-none bg-transparent pt-0 pb-[38px] max-[640px]:pb-[30px]',
      )}
    />
    {cookSheet !== 'closed' && <CookMode title={page.title} blocks={recipeBlocks} open={cookSheet === 'open'} onClose={closeCookSheet} onFinish={finishCookSheet} onClassic={chooseClassic}
      media={photo ? <ResponsiveImage src={photo} sizes="(max-width: 1024px) 100vw, 45vw" loading="lazy" alt="" /> : undefined}
      facts={recipeFactItems(page).filter(([label]) => label !== 'Yield' && label !== 'Cook Time').map(([label, value]) => `${label.replace(' Time', '')} ${value}`).join(' · ')} />}
    {rating && <div className="mx-auto -mt-8 max-w-[1120px] px-7 pb-12 max-[640px]:px-[18px] print:hidden"><div className="max-w-[var(--layout-recipe-copy)]">{rating}</div></div>}
    </>
  )
}
