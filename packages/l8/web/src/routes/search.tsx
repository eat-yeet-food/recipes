import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { SearchPage } from '@eat-yeet/l7-search/search/search'
import { FACET_KEYS, emptySearch, type SearchState } from '@eat-yeet/l2-recipe-domain/search'
import { ssrPrefetch } from '@eat-yeet/l3-api-query/prefetch'
import { APP_CONFIG } from '@/lib/app-config'
import { buildSeoMeta } from '@/lib/seo'
import { recipeApi, recipeQueries } from '@/lib/api'

const APP_COPY = APP_CONFIG.copy

/**
 * Facets travel as comma-separated strings — `?courses=mains,desserts` — rather
 * than the router's default JSON array encoding. The URLs stay readable and
 * shareable, which is the whole reason these are in the URL at all.
 */
export interface SearchUrl {
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
  loader: async ({ context }) => {
    await ssrPrefetch(context.queryClient.prefetchQuery(recipeQueries.list()))
  },
  head: () =>
    buildSeoMeta({
      title: APP_COPY.pages.searchTitle,
      description: APP_COPY.pages.searchDescription,
      canonicalPath: '/search',
      noindex: true,
    }, APP_CONFIG),
  component: SearchRoute,
})

function SearchRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/search' })
  const { data } = recipeApi.useList()

  /**
   * Only one /search document is prerendered, and Cloudflare Pages serves it
   * for every query string — files are not selected by query. So a cold load of
   * `/search?courses=mains` gets HTML rendered with no filters, and rendering
   * the filtered results on the first client pass is a hydration mismatch
   * (React error #418), which throws away the server markup and re-renders the
   * whole page.
   *
   * Matching the server on pass one and applying the params right after keeps
   * the markup intact. Every home and browse category card links to such a URL,
   * so this is the common path, not an edge case.
   */
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  return (
    <SearchPage
      recipes={data?.recipes ?? []}
      state={hydrated ? toState(search) : emptySearch()}
      onChange={(next) => navigate({ search: toUrl(next), replace: true })}
    />
  )
}
