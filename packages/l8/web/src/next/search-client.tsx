'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchPage } from '@eat-yeet/l7-search/search/search'
import { emptySearch, FACET_KEYS } from '@eat-yeet/l2-recipe-domain/search'
export function SearchClient({ recipes }: { recipes: any[] }) {
  const router = useRouter(),
    params = useSearchParams(),
    state = emptySearch()
  state.q = params.get('q') ?? ''
  for (const k of FACET_KEYS)
    state[k] = (params.get(k) || '').split(',').filter(Boolean)
  return (
    <SearchPage
      recipes={recipes}
      state={state}
      onChange={(next) => {
        const query = new URLSearchParams()
        if (next.q) query.set('q', next.q)
        for (const k of FACET_KEYS)
          if (next[k].length) query.set(k, next[k].join(','))
        router.replace('/search' + (query.size ? '?' + query : ''), {
          scroll: false,
        })
      }}
    />
  )
}
