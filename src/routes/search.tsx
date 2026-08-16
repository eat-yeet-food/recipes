import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { SearchPage } from '../components/search'
import { FACET_KEYS, emptySearch, type SearchState } from '../lib/model'
import { buildSeoMeta } from '../lib/seo'

/**
 * Facets travel as comma-separated strings — `?courses=mains,desserts` — rather
 * than the router's default JSON array encoding. The URLs stay readable and
 * shareable, which is the whole reason these are in the URL at all.
 */
interface SearchUrl {
  q?: string
  category?: string
  courses?: string
  cuisines?: string
  methods?: string
  restrictions?: string
  occasions?: string
}

const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

function validateSearch(search: Record<string, unknown>): SearchUrl {
  const out: SearchUrl = {}
  if (str(search.q)) out.q = String(search.q)
  for (const key of FACET_KEYS) {
    const value = str(search[key])
    if (value) out[key] = value
  }
  return out
}

/** URL strings -> the array-shaped state the page filters with. */
function toState(search: SearchUrl): SearchState {
  const state = emptySearch()
  state.q = search.q ?? ''
  for (const key of FACET_KEYS) {
    const raw = search[key]
    if (raw) state[key] = raw.split(',').filter(Boolean)
  }
  return state
}

/** ...and back again, dropping anything empty so `/search` stays clean. */
function toUrl(state: SearchState): SearchUrl {
  const out: SearchUrl = {}
  if (state.q) out.q = state.q
  for (const key of FACET_KEYS) {
    if (state[key]?.length) out[key] = state[key].join(',')
  }
  return out
}

export const Route = createFileRoute('/search')({
  validateSearch,
  head: () =>
    buildSeoMeta({
      title: 'Recipes | Eat / Yeet',
      description:
        'Search every recipe by name, ingredient, or technique, and filter by course, cuisine, method, and diet.',
      canonicalPath: '/search',
    }),
  component: SearchRoute,
})

function SearchRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/search' })

  return (
    <SearchPage
      state={toState(search)}
      onChange={(next) => navigate({ search: toUrl(next), replace: true })}
    />
  )
}
