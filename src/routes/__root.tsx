/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { ErrorState, NotFound } from '../components/error-states'
import { Footer, Nav } from '../components/layout'
import { SearchPalette } from '../components/palette'
import globalCss from '../styles/global.css?url'
import siteOverridesCss from '../styles/site-overrides.css?url'

/**
 * Head defaults, from the original __root.tsx: favicon, global styles, and the
 * display fonts that need to arrive before first paint. Per-route titles,
 * descriptions, canonical links, and OG tags come from buildSeoMeta().
 */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Eat / Yeet' },
      {
        name: 'description',
        content:
          'A curated collection of artisan recipes. No life stories, no SEO filler — just tested, refined recipes.',
      },
      { property: 'og:site_name', content: 'Eat / Yeet' },
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
      {/* __root.tsx:108-113 — the target existed without this, so keyboard
          users had no way to skip the nav. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-charcoal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>
      <Nav pathname={location.pathname} onOpenPalette={() => setPaletteOpen(true)} />
      <main id="main-content" className="flex-1 pt-[var(--header-offset)]">
        <Outlet />
      </main>
      <Footer />
      <SearchPalette open={paletteOpen} onClose={close} />
    </div>
  )
}

/**
 * The layout custom properties the original set on :root ahead of the sheet.
 * Inline so they apply before the stylesheet resolves.
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
