'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  NavigationProvider,
  hrefFor,
  type Destination,
} from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import {
  MediaProvider,
  type MediaMap,
} from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
import { Nav, Footer } from '@eat-yeet/l6-ui-shell/shell/layout'
import { SearchPalette } from '@eat-yeet/l7-search/search/palette'
import type { RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'
export function SiteShell({
  children,
  site,
  media,
  recipes,
}: {
  children: ReactNode
  site: any
  media: MediaMap
  recipes: RecipeSummary[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const navigate = useCallback(
    (d: Destination) => {
      const href = hrefFor(d)
      d.replace ? router.replace(href) : router.push(href)
    },
    [router],
  )
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'k' &&
        document.body.dataset.workbenchOpen !== 'true'
      ) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return (
    <NavigationProvider navigate={navigate}>
      <MediaProvider media={media}>
        <div className="flex min-h-screen flex-col">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-skip-link)] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
          >
            Skip to content
          </a>
          <Nav
            navigation={site.navigation}
            pathname={pathname}
            siteName={site.siteName}
            wordmark={site.copy.wordmark}
            onOpenPalette={() => setOpen(true)}
          />
          <main id="main-content" className="flex-1 pt-[var(--header-offset)]">
            {children}
          </main>
          <Footer
            navigation={site.navigation}
            siteName={site.siteName}
            wordmark={site.copy.wordmark}
          />
          <SearchPalette
            recipes={recipes}
            open={open}
            onClose={() => setOpen(false)}
          />
        </div>
      </MediaProvider>
    </NavigationProvider>
  )
}
