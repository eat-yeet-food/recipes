/**
 * Browser runtime. Renders the routed page into #app on every hash change and
 * wires the interactive pieces — search field, filter sidebar, and the global
 * search palette — back into the hash, so every view is a reloadable URL.
 *
 * Runs as a classic script (no modules): `file://` blocks module loading.
 */

;(function () {
  const recipes = window.__RECIPES__
  const categories = window.__CATEGORIES__
  const assets = window.__ASSETS__
  const browseCards = window.__BROWSE_CARDS__
  const app = document.getElementById('app')

  let currentRoute = parseHash(location.hash)
  let typing = false

  function currentSearchState() {
    return currentRoute.name === 'search' ? currentRoute.state : { q: '', ...emptyFilters() }
  }

  function go(hash, { replace = false } = {}) {
    if (replace) {
      history.replaceState(null, '', hash)
      render()
    } else {
      location.hash = hash
    }
  }

  function render() {
    currentRoute = parseHash(location.hash)
    document.title = pageTitle(recipes, categories, currentRoute)
    app.innerHTML = renderShell(recipes, categories, currentRoute, assets, browseCards)
    bind()
  }

  // --- search palette ----------------------------------------------------

  let paletteQuery = ''
  let activeIndex = 0

  function paletteEl() {
    return document.querySelector('[data-palette]')
  }

  function paletteHits() {
    const q = paletteQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return recipes.filter((r) => r.searchText.includes(q)).slice(0, 8)
  }

  function drawPalette() {
    const root = paletteEl()
    if (!root) return
    const body = root.querySelector('[data-palette-body]')
    const field = root.querySelector('[data-palette-field]')
    const { html, showFooter } = paletteResults(recipes, paletteQuery)

    body.innerHTML = html + (showFooter ? renderPaletteFooter(paletteQuery) : '')
    field.className =
      'flex items-center px-4 max-sm:h-14 max-sm:border-b' + (showFooter ? ' sm:border-b' : '')

    // Highlight follows keyboard navigation.
    const buttons = body.querySelectorAll('[data-palette-hit]')
    buttons.forEach((button, i) => {
      button.classList.toggle('bg-charcoal/3', i === activeIndex)
      button.parentElement.setAttribute('aria-selected', String(i === activeIndex))
    })

    for (const button of buttons) {
      button.addEventListener('click', () => openRecipe(button.dataset.paletteHit))
    }
    const all = body.querySelector('[data-palette-all]')
    if (all) all.addEventListener('click', () => openAll())
  }

  function openPalette() {
    const root = paletteEl()
    if (!root) return
    paletteQuery = ''
    activeIndex = 0
    root.hidden = false
    document.body.style.overflow = 'hidden'
    const input = root.querySelector('#palette-input')
    input.value = ''
    input.focus()
    drawPalette()
  }

  function closePalette() {
    const root = paletteEl()
    if (!root) return
    root.hidden = true
    document.body.style.overflow = ''
  }

  function openRecipe(slug) {
    closePalette()
    go('#/r/' + encodeURIComponent(slug))
  }

  function openAll() {
    const query = paletteQuery
    closePalette()
    go(searchHash({ ...emptyFilters(), q: query }))
  }

  function bindPalette() {
    const root = paletteEl()
    if (!root) return

    for (const button of document.querySelectorAll('[data-palette-open]')) {
      button.addEventListener('click', openPalette)
    }
    root.querySelector('[data-palette-overlay]').addEventListener('click', closePalette)
    root.querySelector('[data-palette-close]').addEventListener('click', closePalette)

    const input = root.querySelector('#palette-input')
    input.addEventListener('input', (event) => {
      paletteQuery = event.target.value
      activeIndex = 0
      drawPalette()
    })
    input.addEventListener('keydown', (event) => {
      const hits = paletteHits()
      if (event.key === 'Escape') {
        closePalette()
      } else if (event.key === 'ArrowDown' && hits.length > 0) {
        event.preventDefault()
        activeIndex = (activeIndex + 1) % hits.length
        drawPalette()
      } else if (event.key === 'ArrowUp' && hits.length > 0) {
        event.preventDefault()
        activeIndex = (activeIndex - 1 + hits.length) % hits.length
        drawPalette()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (hits[activeIndex]) openRecipe(hits[activeIndex].slug)
        else if (paletteQuery.trim()) openAll()
      }
    })
  }

  // --- search page controls ----------------------------------------------

  function bind() {
    const input = document.getElementById('search-input')
    if (input) {
      // Typing rewrites the hash, which re-renders the page — restore focus and
      // caret so the field survives its own replacement. Only when the user was
      // already typing, so arriving at /search doesn't steal focus.
      if (typing) {
        const caret = input.value.length
        input.focus()
        input.setSelectionRange(caret, caret)
      }

      let timer = null
      input.addEventListener('input', (event) => {
        clearTimeout(timer)
        const value = event.target.value
        typing = true
        timer = setTimeout(() => {
          go(searchHash({ ...currentSearchState(), q: value }), { replace: true })
        }, 180)
      })
    }

    // Checkbox rows toggle one facet value.
    for (const row of document.querySelectorAll('[data-facet][data-value]')) {
      row.addEventListener('click', (event) => {
        event.preventDefault()
        const { facet, value } = row.dataset
        const state = currentSearchState()
        const selected = state[facet] ?? []
        const next = selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value]
        go(searchHash({ ...state, [facet]: next }))
      })
    }

    // Category is single-select; the empty value clears it.
    for (const button of document.querySelectorAll('[data-category]')) {
      button.addEventListener('click', () => {
        const value = button.dataset.category
        go(searchHash({ ...currentSearchState(), category: value ? [value] : [] }))
      })
    }

    // Collapsible facet groups.
    for (const toggle of document.querySelectorAll('[data-facet-toggle]')) {
      toggle.addEventListener('click', () => {
        const group = toggle.parentElement
        const body = group.querySelector('[data-facet-body]')
        const open = group.getAttribute('data-state') === 'open'
        group.setAttribute('data-state', open ? 'closed' : 'open')
        body.hidden = open
        toggle.querySelector('svg').classList.toggle('rotate-180', open)
      })
    }

    const clear = document.getElementById('clear-filters')
    if (clear) clear.addEventListener('click', () => go('#/search'))

    bindPalette()
  }

  // --- global -------------------------------------------------------------

  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      const root = paletteEl()
      if (root && root.hidden) openPalette()
      else closePalette()
    } else if (event.key === 'Escape') {
      closePalette()
    }
  })

  window.addEventListener('hashchange', () => {
    render()
    if (currentRoute.name !== 'search') {
      typing = false
      window.scrollTo(0, 0)
    }
  })

  // The build ships pre-rendered markup for the initial route; only re-render
  // when the opening hash asks for something else.
  if (parseHash(location.hash).name !== window.__INITIAL_ROUTE__) render()
  else bind()
})()
