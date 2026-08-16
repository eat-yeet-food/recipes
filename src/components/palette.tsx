/**
 * Global search palette, from
 * features/recipes/components/search-command-palette.tsx and the shadcn Dialog
 * it renders inside (packages/ui/src/components/dialog.tsx).
 *
 * The original queried the API with a debounce; this filters the local index.
 * Opens from the nav search button or Cmd/Ctrl-K.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Icon } from './icons'
import { humanizeMinutes, labelize } from '../lib/format'
import { INDEX, imageUrl, type RecipeSummary } from '../lib/recipes'

const MIN_QUERY = 2
const MAX_RESULTS = 8

const OVERLAY =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50'

const CONTENT =
  'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed z-50 grid w-full max-w-[calc(100%-2rem)] duration-200 outline-none ' +
  'gap-0 overflow-hidden border border-border-medium bg-white p-0 shadow-xl ' +
  'max-sm:left-0 max-sm:top-0 max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 ' +
  'sm:left-[50%] sm:top-[20%] sm:-translate-x-1/2 sm:translate-y-0 sm:rounded-xl sm:max-w-lg'

const KBD =
  'rounded border border-charcoal/10 bg-charcoal/5 px-1.5 py-0.5 font-body text-[10px] text-charcoal/65'

const hitsFor = (query: string): RecipeSummary[] => {
  const q = query.trim().toLowerCase()
  if (q.length < MIN_QUERY) return []
  return INDEX.filter((r) => r.searchText.includes(q)).slice(0, MAX_RESULTS)
}

/** The 40px thumbnail beside each hit. */
function ResultImage({ recipe }: { recipe: RecipeSummary }) {
  const src = imageUrl(recipe)
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-charcoal/5">
      {src ? (
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon name="utensils-crossed" className="size-4 text-charcoal/15" strokeWidth="1.25" />
        </div>
      )}
    </div>
  )
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const hits = hitsFor(query)
  const showFooter = query.trim().length >= MIN_QUERY

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const openRecipe = (slug: string) => {
    onClose()
    navigate({ to: '/recipes/$slug', params: { slug } })
  }

  const openAll = () => {
    onClose()
    navigate({ to: '/search', search: { q: query } })
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      onClose()
    } else if (event.key === 'ArrowDown' && hits.length > 0) {
      event.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (event.key === 'ArrowUp' && hits.length > 0) {
      event.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (hits[active]) openRecipe(hits[active].slug)
      else if (query.trim()) openAll()
    }
  }

  return (
    <div data-palette hidden={!open}>
      <div
        data-palette-overlay
        data-slot="dialog-overlay"
        data-state="open"
        className={OVERLAY}
        onClick={onClose}
      />
      <div
        data-slot="dialog-content"
        data-state="open"
        role="dialog"
        aria-modal="true"
        aria-label="Search recipes"
        className={CONTENT}
      >
        <div
          data-palette-field
          className={`flex items-center px-4 max-sm:h-14 max-sm:border-b${showFooter ? ' sm:border-b' : ''}`}
        >
          <Icon name="search" className="size-4 shrink-0 text-charcoal/50" />
          <input
            ref={inputRef}
            id="palette-input"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="search-results-listbox"
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="Search recipes..."
            className="h-12 flex-1 bg-transparent px-3 font-body text-base text-charcoal outline-none placeholder:text-charcoal/50 sm:text-sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
          />
          <div className="hidden items-center gap-1.5 sm:flex">
            <kbd className={KBD}>&#8984;K</kbd>
            <kbd className={KBD}>ESC</kbd>
          </div>
          <button
            type="button"
            data-palette-close
            onClick={onClose}
            className="font-body text-sm font-medium text-charcoal/65 transition-colors hover:text-charcoal sm:hidden"
          >
            Cancel
          </button>
        </div>

        <div data-palette-body>
          {showFooter && hits.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-charcoal/65">
                No recipes found for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {hits.length > 0 && (
            <ul
              id="search-results-listbox"
              role="listbox"
              className="max-h-[min(60vh,300px)] overflow-y-auto scrollbar-none py-2 sm:max-h-[300px]"
            >
              {hits.map((recipe, index) => {
                const time = humanizeMinutes(recipe.totalMinutes)
                const kind = recipe.category ? labelize(recipe.category) : ''
                return (
                  <li
                    key={recipe.slug}
                    id={`search-result-${recipe.slug}`}
                    role="option"
                    aria-selected={index === active}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      data-palette-hit={recipe.slug}
                      data-index={index}
                      onClick={() => openRecipe(recipe.slug)}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-charcoal/3${index === active ? ' bg-charcoal/3' : ''}`}
                    >
                      <ResultImage recipe={recipe} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-charcoal">
                          {recipe.title}
                        </p>
                        <div className="mt-0.5 flex gap-3 text-xs text-charcoal/65">
                          {time && (
                            <span className="flex items-center gap-1">
                              <Icon name="clock" className="size-3" />
                              {time}
                            </span>
                          )}
                          {kind && (
                            <span className="flex items-center gap-1">
                              <Icon name="utensils-crossed" className="size-3" />
                              {kind}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {showFooter && (
            <div className="border-t px-4 py-2">
              <button
                type="button"
                data-palette-all
                onClick={openAll}
                className="w-full rounded-md px-3 py-2 text-left font-body text-xs font-medium text-charcoal/65 transition-colors hover:bg-charcoal/3 hover:text-charcoal"
              >
                View all results for &ldquo;{query}&rdquo;
                <span className="ml-1 text-charcoal/65">&rarr;</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
