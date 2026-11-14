import 'server-only'

/**
 * The recipe card ChatGPT (and other MCP Apps hosts) shows for search_recipes
 * and get_recipe. Without it, ChatGPT draws its own card with a photo from web
 * image search; this one shows the site's own photo, title, yield and time.
 * It reads only the tool's `cards` (structuredContent), renders text with
 * textContent, and opens recipes through the host. The URI is a cache key:
 * change the version when the markup changes.
 */
export const RECIPE_WIDGET_URI = 'ui://eat-yeet/recipe-cards-v3.html'
export const RECIPE_WIDGET_MIME = 'text/html;profile=mcp-app'

export type RecipeCard = { title: string; description: string; url: string; meta: string; trial?: boolean; photo?: { url: string; alt: string; width?: number; height?: number } }

export const RECIPE_WIDGET_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { --ink: #2a0e28; --pink: #ff7ac0; --orange: #ff8a3d; --muted: #6b5568; --card: #ffffff; --line: #f1dce9; --soft: #fff0f7; }
:root.dark { --ink: #ffe3f1; --muted: #c9a9c2; --card: #1c0819; --line: #3a1638; --soft: #2a0e28; }
* { box-sizing: border-box; }
html, body { margin: 0; background: transparent; color: var(--ink); font: 15px/1.45 Avenir, "Avenir Next", -apple-system, system-ui, sans-serif; }
.list { display: grid; gap: 12px; padding: 2px; }
.card { display: flex; gap: 14px; align-items: stretch; background: var(--card); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; cursor: pointer; text-decoration: none; color: inherit; position: relative; }
.card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, var(--pink), var(--orange)); }
.card:focus-visible { outline: 3px solid var(--pink); outline-offset: 2px; }
.thumb { flex: 0 0 140px; min-height: 120px; background: var(--soft) center / cover no-repeat; }
.body { padding: 16px 16px 14px 2px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.title { font: 700 19px/1.2 "geller-headline", Georgia, serif; margin: 0; }
.desc { color: var(--muted); margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.meta { font-size: 13px; color: var(--muted); margin-top: auto; padding-top: 6px; }
.badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; background: var(--ink); color: var(--card); border-radius: 999px; padding: 2px 8px; margin-right: 6px; vertical-align: 1px; }
.go { align-self: flex-start; margin-top: 8px; font-weight: 700; font-size: 14px; background: var(--ink); color: var(--card); border-radius: 999px; padding: 7px 14px; }
.hero { flex-direction: column; gap: 0; }
.hero .thumb { flex: none; width: 100%; aspect-ratio: 2 / 1; min-height: 0; }
.hero .body { padding: 16px 18px 18px; }
.hero .title { font-size: 26px; }
.hero .desc { -webkit-line-clamp: 4; font-size: 16px; }
.brand { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); padding: 0 4px 8px; }
.brand b { background: var(--pink); color: #2a0e28; border-radius: 6px; padding: 1px 6px; transform: rotate(-3deg); display: inline-block; }
@media (max-width: 420px) { .thumb { flex-basis: 104px; } .title { font-size: 17px; } }
</style></head>
<body><div id="root"></div>
<script type="module">
const root = document.getElementById('root')
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n }
// MCP Apps bridge (JSON-RPC over postMessage): initialize, then the host sends the tool result.
let nextId = 1
const pending = new Map()
const post = (message) => window.parent.postMessage({ jsonrpc: '2.0', ...message }, '*')
const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); post({ id, method, params }) })
const notify = (method, params) => post({ method, params })
const open = (href) => {
  if (!String(href).startsWith('https://')) return
  if (window.openai?.openExternal) return window.openai.openExternal({ href, redirectUrl: false })
  request('ui/open-link', { url: href }).catch(() => window.open(href, '_blank', 'noopener'))
}
function card(c, hero) {
  const a = el('a', hero ? 'card hero' : 'card')
  a.href = c.url; a.target = '_blank'; a.rel = 'noopener'
  a.addEventListener('click', (event) => { event.preventDefault(); open(c.url) })
  const thumb = el('div', 'thumb')
  if (c.photo && String(c.photo.url).startsWith('https://')) { thumb.style.backgroundImage = 'url("' + encodeURI(c.photo.url) + '")'; thumb.setAttribute('role', 'img'); thumb.setAttribute('aria-label', c.photo.alt || c.title) }
  const body = el('div', 'body')
  const title = el('h2', 'title')
  if (c.trial) title.append(el('span', 'badge', 'Trial'))
  title.append(document.createTextNode(c.title))
  body.append(title, el('p', 'desc', c.description))
  if (c.meta) body.append(el('div', 'meta', c.meta))
  if (hero) body.append(el('span', 'go', 'View the recipe'))
  a.append(thumb, body)
  return a
}
function render(output) {
  const cards = Array.isArray(output?.cards) ? output.cards : []
  if (!cards.length) return
  root.replaceChildren()
  const brand = el('div', 'brand'); brand.append(document.createTextNode('Eat '), el('b', '', 'Yeet'))
  const list = el('div', 'list')
  const hero = cards.length === 1
  for (const c of cards.slice(0, 6)) list.append(card(c, hero))
  root.append(brand, list)
  requestAnimationFrame(size)
}
const setTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark')
const size = () => {
  const height = Math.ceil(document.documentElement.scrollHeight)
  notify('ui/notifications/size-changed', { height })
  window.openai?.notifyIntrinsicHeight?.(height)
}
new ResizeObserver(size).observe(document.body)
window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return
  const message = event.data
  if (message?.jsonrpc !== '2.0') return
  if (message.id !== undefined && pending.has(message.id) && !message.method) {
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id)
    return message.error ? reject(message.error) : resolve(message.result)
  }
  if (message.method === 'ui/notifications/tool-result') render(message.params?.structuredContent)
  if (message.method === 'ui/notifications/host-context-changed' && message.params?.theme) setTheme(message.params.theme)
  if (message.method === 'ui/resource-teardown' && message.id !== undefined) post({ id: message.id, result: {} })
})
// ChatGPT also exposes window.openai; use it when present.
setTheme(window.openai?.theme); render(window.openai?.toolOutput)
window.addEventListener('openai:set_globals', (event) => { setTheme(window.openai?.theme); render(event.detail?.globals?.toolOutput ?? window.openai?.toolOutput) })
request('ui/initialize', { appInfo: { name: 'eat-yeet-recipe-cards', version: '2.0.0' }, appCapabilities: { availableDisplayModes: ['inline'] }, protocolVersion: '2026-01-26' })
  .then((result) => { if (result?.hostContext?.theme) setTheme(result.hostContext.theme); notify('ui/notifications/initialized', {}); size() })
  .catch(() => {})
</script></body></html>`
