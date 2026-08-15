/**
 * Hash routing vocabulary. Shared by the templates (which build links) and the
 * router (which reads them). Hash-based because the built file is opened over
 * `file://`, where the History API and clean URLs do not work.
 *
 *   #/                          home
 *   #/search?q=&courses=mains   search, filters comma-separated
 *   #/c/:slug                   category
 *   #/r/:slug                   recipe
 */

import { FACET_KEYS, emptyFilters } from './model.js'

/** Build a `#/search?…` link from a partial search state. */
export function searchHash(state = {}) {
  const params = []
  if (state.q) params.push(`q=${encodeURIComponent(state.q)}`)
  for (const key of FACET_KEYS) {
    const values = state[key] ?? []
    if (values.length > 0) {
      params.push(`${key}=${values.map(encodeURIComponent).join(',')}`)
    }
  }
  return params.length > 0 ? `#/search?${params.join('&')}` : '#/search'
}

/** A search state selecting exactly one facet value. */
export function facetHash(key, value) {
  return searchHash({ [key]: [value] })
}

function parseSearchState(queryString) {
  const state = { q: '', ...emptyFilters() }
  if (!queryString) return state

  for (const pair of queryString.split('&')) {
    if (!pair) continue
    const index = pair.indexOf('=')
    const key = decodeURIComponent(index === -1 ? pair : pair.slice(0, index))
    const raw = index === -1 ? '' : pair.slice(index + 1)
    if (key === 'q') {
      state.q = decodeURIComponent(raw.replace(/\+/g, ' '))
    } else if (FACET_KEYS.includes(key) && raw) {
      state[key] = raw.split(',').filter(Boolean).map(decodeURIComponent)
    }
  }
  return state
}

/** Turn `location.hash` into a route descriptor. */
export function parseHash(hash) {
  const clean = String(hash ?? '').replace(/^#/, '') || '/'
  const [path, query] = clean.split('?')
  const parts = path.split('/').filter(Boolean)

  if (parts.length === 0) return { name: 'home' }
  if (parts[0] === 'search') return { name: 'search', state: parseSearchState(query) }
  if (parts[0] === 'c' && parts[1]) return { name: 'category', slug: decodeURIComponent(parts[1]) }
  if (parts[0] === 'r' && parts[1]) return { name: 'recipe', slug: decodeURIComponent(parts[1]) }
  return { name: 'notFound' }
}
