/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { ErrorState, NotFound } from '@eat-yeet/l6-ui-shell/shell/error-states'
import { Footer, Nav } from '@eat-yeet/l6-ui-shell/shell/layout'
import { SearchPalette } from '@eat-yeet/l7-search/search/palette'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import type { RouterContext } from '../router'
import globalCss from '../styles/global.css?url'
import siteOverridesCss from '../styles/site-overrides.css?url'
import { APP_CONFIG } from '@/lib/app-config'
import { recipeApi, recipeQueries } from '@/lib/api'

const APP_COPY = APP_CONFIG.copy

/**
 * Head defaults: favicon, global styles, and display fonts that need to arrive
 * before first paint. Per-route titles, descriptions, canonical links, and OG
 * tags come from buildSeoMeta().
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async ({ context }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(recipeQueries.list()))
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: APP_CONFIG.siteName },
      {
        name: 'description',
        content: APP_COPY.description,
      },
      { property: 'og:site_name', content: APP_CONFIG.siteName },
    ],
    links: [
      { rel: 'icon', href: '/donut-icon.svg', type: 'image/svg+xml' },
      { rel: 'stylesheet', href: globalCss },
      { rel: 'stylesheet', href: siteOverridesCss },
      { rel: 'preload', href: '/fonts/bowlby-one-sc-latin.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: '/fonts/geller/typekit-geller-headline-regular.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: '/fonts/geller/typekit-geller-headline-bold.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: '/fonts/avenir/avenirnextltpro-medium-webfont.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: '/fonts/avenir/AvenirNextLTPro-Bold.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    ],
  }),
  component: RootLayout,
  errorComponent: ErrorState,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootLayout() {
  const { location } = useRouterState()
  const { data } = recipeApi.useList()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const close = useCallback(() => setPaletteOpen(false), [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      } else if (event.key === 'Escape') {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Keyboard users need a stable target to skip the site nav. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-skip-link)] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>
      <Nav
        pathname={location.pathname}
        siteName={APP_CONFIG.siteName}
        wordmark={APP_COPY.wordmark}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main id="main-content" className="flex-1 pt-[var(--header-offset)]">
        <Outlet />
      </main>
      <Footer siteName={APP_CONFIG.siteName} wordmark={APP_COPY.wordmark} />
      <SearchPalette recipes={data?.recipes ?? []} open={paletteOpen} onClose={close} />
    </div>
  )
}

/**
 * Layout custom properties that must apply before the stylesheet resolves.
 */
const ROOT_VARS =
  ':root { --nav-h: 4rem; --header-offset: calc(var(--nav-h) + var(--impersonation-h, 0px)); }'

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: ROOT_VARS }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
