/**
 * Site shell chrome: fixed nav, footer, responsive menu, and search launcher.
 */

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Menu, Search } from 'lucide-react'
import { Wordmark, type WordmarkCopy } from './wordmark'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { cn } from '@eat-yeet/l0-foundation/utils'

/** Routes with a hero, where the nav starts transparent. */
function routeHasHero(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '')
  return path === '/'
}

/** A dark hero additionally flips nav text to white. */
function routeHasDarkHero(pathname: string): boolean {
  return false
}

/**
 * Transparent over a hero until the page scrolls, then opaque white. Every
 * hero is prerendered, so no client readiness gate is needed before using the
 * transparent state.
 */
export function Nav({
  pathname,
  siteName,
  wordmark,
  onOpenPalette,
}: {
  pathname: string
  siteName: string
  wordmark: WordmarkCopy
  onOpenPalette: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // rAF-throttled and passive, so scrolling stays smooth.
  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onHeroPage = routeHasHero(pathname) && !scrolled
  const heroVisible = routeHasDarkHero(pathname) && !scrolled
  const navBg = onHeroPage
    ? 'bg-transparent'
    : 'bg-white/92 backdrop-blur-[16px] shadow-[0_1px_0_color-mix(in_srgb,var(--color-ink)_8%,transparent)]'

  // <Wordmark> carries its own color, so only the over-photo shadow varies.
  const wordmarkClass = onHeroPage
    ? 'transition-nav-icon max-md:drop-shadow-[0_2px_12px_color-mix(in_srgb,var(--color-black)_50%,transparent)]'
    : 'transition-nav-icon'

  const linkClass = heroVisible
    ? 'font-nav text-sm font-[900] uppercase tracking-wider transition-nav-text text-white [text-shadow:0_1px_8px_color-mix(in_srgb,var(--color-black)_45%,transparent),0_0_16px_color-mix(in_srgb,var(--color-black)_20%,transparent)] hover:text-highlight'
    : 'font-nav text-sm font-[900] uppercase tracking-wider transition-nav-text text-ink hover:text-ink/70'

  const searchBtnClass = heroVisible
    ? 'text-white/80 hover:bg-white/10 hover:text-white'
    : 'text-ink/65 hover:text-ink'

  return (
    <nav
      data-site-nav=""
      className={`fixed top-[var(--impersonation-h,0px)] left-0 z-[var(--z-nav)] w-full transition-nav ${navBg}`}
    >
      <div
        data-site-nav-inner=""
        className="mx-auto flex h-16 max-w-[var(--max-width)] items-center justify-between px-4 md:px-6"
      >
        <div className="flex items-center gap-2">
          <Link to="/" data-site-brand="" className="flex items-center gap-2" aria-label={`${siteName} home`}>
            <Wordmark copy={wordmark} size="nav" onPhoto={onHeroPage} className={wordmarkClass} />
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-6">
            <Link to="/search" className={linkClass}>
              Recipes
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-10', searchBtnClass)}
              aria-label="Search recipes"
              data-palette-open=""
              onClick={onOpenPalette}
            >
              <Search className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 md:gap-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-10', onHeroPage ? 'md:hidden text-white hover:text-white/80' : 'md:hidden')}
              aria-label="Search recipes"
              data-palette-open=""
              onClick={onOpenPalette}
            >
              <Search className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'size-10',
                onHeroPage ? 'max-md:text-white max-md:hover:text-white/80' : '',
                heroVisible ? 'text-white hover:text-white/80' : '',
              )}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu className="size-6" />
            </Button>
          </div>
        </div>
      </div>
      <div id="mobile-nav-menu" hidden={!menuOpen} className="border-t border-ink/10 bg-white px-4 py-3 md:hidden">
        <div className="mx-auto flex max-w-[var(--max-width)] flex-col gap-1">
          <Link
            to="/search"
            onClick={() => setMenuOpen(false)}
            className="rounded px-2 py-3 font-nav text-sm font-[900] uppercase tracking-wider text-ink hover:bg-ink/5"
          >
            Recipes
          </Link>
          <Link
            to="/browse"
            onClick={() => setMenuOpen(false)}
            className="rounded px-2 py-3 font-nav text-sm font-[900] uppercase tracking-wider text-ink hover:bg-ink/5"
          >
            Browse
          </Link>
          <button
            type="button"
            data-palette-open=""
            onClick={() => {
              setMenuOpen(false)
              onOpenPalette()
            }}
            className="rounded px-2 py-3 text-left font-nav text-sm font-[900] uppercase tracking-wider text-ink hover:bg-ink/5"
          >
            Search
          </button>
        </div>
      </div>
    </nav>
  )
}

/** footer.tsx */
export function Footer({ siteName, wordmark }: { siteName: string; wordmark: WordmarkCopy }) {
  const linkClass =
    'text-[13px] font-medium uppercase tracking-[1.5px] text-ink/40 transition-colors hover:text-brand'
  const [year, setYear] = useState('2026')

  useEffect(() => {
    setYear(String(new Date().getFullYear()))
  }, [])

  return (
    <footer data-site-footer="" className="bg-white px-8 text-center print:hidden">
      <div className="mx-auto max-w-[var(--max-width)] py-9">
        <div data-site-footer-brand="" className="flex justify-center">
          <Wordmark copy={wordmark} size="footer" />
        </div>
        <nav data-site-footer-links="" className="mt-4 flex justify-center gap-6" aria-label="Footer">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          <Link to="/search" className={linkClass}>
            Recipes
          </Link>
          <Link to="/browse" className={linkClass}>
            Browse
          </Link>
        </nav>
        <p className="mt-4 text-[11px] tracking-[1px] text-ink/70">
          &copy; {year} {siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
