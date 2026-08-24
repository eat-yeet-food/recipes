/**
 * Global search palette. Opens from the nav search button or Cmd/Ctrl-K and
 * filters the local generated recipe index.
 *
 * Built on real shadcn/Radix primitives (Command + Dialog, via cmdk) rather
 * than custom dialog state: focus trap, `inert`-ing the rest of the page,
 * Escape-to-close, and the ARIA dialog/combobox/listbox wiring all come from
 * Radix's Dialog and cmdk.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Clock, UtensilsCrossed } from 'lucide-react'
import { Command, CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem } from '@eat-yeet/l5-ui-primitives/primitives/command'
import { humanizeMinutes, labelize } from '@eat-yeet/l2-recipe-domain/format'
import { matchesQuery } from '@eat-yeet/l2-recipe-domain/search'
import { imageUrl, type RecipeSummary } from '@eat-yeet/l1-recipe-model/recipes'

const MIN_QUERY = 2
const MAX_RESULTS = 8

const KBD =
  'rounded border border-ink/10 bg-ink/5 px-1.5 py-0.5 font-body text-[10px] text-ink/65'

const hitsFor = (recipes: RecipeSummary[], query: string): RecipeSummary[] => {
  const q = query.trim().toLowerCase()
  if (q.length < MIN_QUERY) return []
  return recipes.filter((r) => matchesQuery(r, q)).slice(0, MAX_RESULTS)
}

/** The 40px thumbnail beside each hit. */
function ResultImage({ recipe }: { recipe: RecipeSummary }) {
  const src = imageUrl(recipe)
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-ink/5">
      {src ? (
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <UtensilsCrossed className="size-4 text-ink/15" strokeWidth="1.25" />
        </div>
      )}
    </div>
  )
}

export function SearchPalette({
  recipes,
  open,
  onClose,
}: {
  recipes: RecipeSummary[]
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()

  const hits = hitsFor(recipes, query)
  const showFooter = query.trim().length >= MIN_QUERY

  // Radix handles trapping focus and inert-ing the rest of the page. Focus
  // restore is kept here because this Command-inside-Dialog composition lands
  // on <body> unless we explicitly return to the triggering element.
  useEffect(() => {
    if (open) {
      lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setQuery('')
    } else {
      lastFocusRef.current?.focus()
      lastFocusRef.current = null
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

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Search recipes"
      description="Search recipes by title, ingredient, or category"
      // Full-screen below sm, centered with a fixed width and sitting a fifth
      // of the way down the viewport at sm and up.
      className="gap-0 border border-border-medium bg-white p-0 shadow-xl ring-0 max-sm:top-0 max-sm:left-0 max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 sm:top-[20%] sm:left-[50%] sm:max-w-lg sm:-translate-x-1/2 sm:translate-y-0"
    >
      {/* shouldFilter=false: hitsFor()/matchesQuery() already filtered `hits`
          against recipe.searchText (title, ingredients, category, ...), not
          the slug cmdk would otherwise fuzzy-match each CommandItem's `value`
          against -- letting cmdk also filter would silently hide correct
          results whose slug doesn't happen to contain the query text. */}
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search recipes..."
          value={query}
          onValueChange={setQuery}
          wrapperClassName={showFooter ? 'max-sm:h-14 max-sm:border-b sm:border-b' : 'max-sm:h-14 max-sm:border-b'}
          endAddon={
            <>
              <div className="hidden items-center gap-1.5 sm:flex">
                <kbd className={KBD}>&#8984;K</kbd>
                <kbd className={KBD}>ESC</kbd>
              </div>
              <button
                type="button"
                data-palette-close
                onClick={onClose}
                className="font-body text-sm font-medium text-ink/65 transition-colors hover:text-ink sm:hidden"
              >
                Cancel
              </button>
            </>
          }
        />
        <CommandList className="max-h-[min(60vh,300px)] sm:max-h-[300px]">
          {/* Not cmdk's own <CommandEmpty>: it shows only when zero
              CommandItems are mounted at all, but the "view all" item below
              always mounts once showFooter is true -- so cmdk's own count
              would never reach zero and the message could never appear.
              A plain conditional, driven by hits.length like the rest of
              this file's data flow, styled to match. */}
          {showFooter && hits.length === 0 && (
            <p data-slot="command-empty" className="py-6 text-center text-sm">
              No recipes found for &ldquo;{query}&rdquo;
            </p>
          )}

          {hits.length > 0 && (
            <CommandGroup>
              {hits.map((recipe) => {
                const time = humanizeMinutes(recipe.totalMinutes)
                const kind = recipe.category ? labelize(recipe.category) : ''
                return (
                  <CommandItem
                    key={recipe.slug}
                    value={recipe.slug}
                    data-palette-hit={recipe.slug}
                    onSelect={() => openRecipe(recipe.slug)}
                    className="items-start gap-3 px-4 py-2.5"
                  >
                    <ResultImage recipe={recipe} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium text-ink">{recipe.title}</p>
                      <div className="mt-0.5 flex gap-3 text-xs text-ink/65">
                        {time && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {time}
                          </span>
                        )}
                        {kind && (
                          <span className="flex items-center gap-1">
                            <UtensilsCrossed className="size-3" />
                            {kind}
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {/* A real, always-rendered-last item rather than a hand-written
              Enter-with-nothing-active keyboard special case -- cmdk already
              handles Enter-selects-active-item, so this is the one remaining
              piece of bespoke behavior (§5.3), expressed the same way as
              every other result instead of a parallel onKeyDown branch. */}
          {showFooter && (
            <CommandGroup>
              <CommandItem value="__view-all__" onSelect={openAll} data-palette-all className="px-4 py-2 text-xs font-medium text-ink/65">
                View all results for &ldquo;{query}&rdquo;
                <span className="ml-1 text-ink/65">&rarr;</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
