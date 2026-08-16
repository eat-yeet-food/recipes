/**
 * Markdown fixtures -> plain recipe objects.
 *
 * Node-only. Inline markdown is rendered to HTML here, at build time, so the
 * browser never needs a markdown parser — the shipped file carries plain data.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

/** `## Heading` -> the recipe field it fills. */
const BLOCKS = {
  equipment: 'equipment',
  ingredients: 'ingredients',
  steps: 'steps',
  notes: 'notes',
  tips: 'tips',
}

const SECTIONED = new Set(['equipment', 'ingredients', 'steps'])

const decodeEntities = (text) =>
  text.replace(/&(#\d+|#x[\da-f]+|amp|lt|gt|quot|apos);/gi, (entity, body) => {
    const name = body.toLowerCase()
    if (name === 'amp') return '&'
    if (name === 'lt') return '<'
    if (name === 'gt') return '>'
    if (name === 'quot') return '"'
    if (name === 'apos') return "'"
    const code = name.startsWith('#x')
      ? Number.parseInt(name.slice(2), 16)
      : Number.parseInt(name.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity
  })

const stripTags = (html) => decodeEntities(html.replace(/<[^>]*>/g, ''))

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const isSafeUrl = (href) => {
  try {
    const url = new URL(href, 'https://eatyeet.com')
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

function renderInlineTokens(tokens = []) {
  return tokens.map((token) => {
    switch (token.type) {
      case 'text':
        return token.tokens ? renderInlineTokens(token.tokens) : token.text
      case 'escape':
        return token.text
      case 'codespan':
        return escapeHtml(token.text)
      case 'strong':
        return `<strong>${renderInlineTokens(token.tokens)}</strong>`
      case 'em':
        return `<em>${renderInlineTokens(token.tokens)}</em>`
      case 'del':
        return `<del>${renderInlineTokens(token.tokens)}</del>`
      case 'br':
        return '<br>'
      case 'link': {
        const text = renderInlineTokens(token.tokens)
        if (!isSafeUrl(token.href)) return text
        return `<a href="${escapeHtml(token.href)}">${text}</a>`
      }
      case 'image':
      case 'html':
        return escapeHtml(token.raw ?? '')
      default:
        return escapeHtml(token.raw ?? token.text ?? '')
    }
  }).join('')
}

/** Render a list item's inline markdown through a small allowlist. */
function renderItem(item) {
  return renderInlineTokens(item.tokens).trim()
}

/**
 * Walk lexer tokens into blocks. `##` switches block, `###` opens a named
 * section within it, and each list contributes its items to the open section.
 */
function parseBody(markdown) {
  const result = { equipment: [], ingredients: [], steps: [], notes: [], tips: [] }
  const tokens = marked.lexer(markdown)

  let block = null
  let section = null

  const openSection = (title) => {
    section = { title, items: [] }
    result[block].push(section)
  }

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      block = BLOCKS[token.text.trim().toLowerCase()] ?? null
      section = null
      continue
    }
    if (!block) continue

    if (token.type === 'heading' && token.depth === 3) {
      if (SECTIONED.has(block)) openSection(token.text.trim())
      continue
    }

    if (token.type === 'list') {
      const items = token.items.map(renderItem)
      if (!SECTIONED.has(block)) {
        result[block].push(...items)
      } else {
        if (!section) openSection('')
        section.items.push(...items)
      }
    }
  }

  return result
}

/** Everything a text query should be able to match. */
function searchTextFor(data) {
  const sectionText = (sections) =>
    sections.flatMap((s) => [s.title, ...s.items.map(stripTags)]).join(' ')
  return [
    data.title,
    data.description,
    sectionText(data.ingredients),
    sectionText(data.equipment),
    sectionText(data.steps),
    data.notes.map(stripTags).join(' '),
    data.tips.map(stripTags).join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

const list = (value) => (Array.isArray(value) ? value : [])
const num = (value) => (typeof value === 'number' ? value : null)
const yieldAmount = (value) => (typeof value === 'number' || typeof value === 'string' ? value : null)

/**
 * YAML parses an unquoted `2026-01-14` into a Date, and `String(date)` gives
 * "Tue Jan 14 2026 …" — sliced to ten characters that was "Tue Jan 14", which
 * sorted recipes by weekday name and produced an invalid schema.org
 * datePublished. Always emit ISO YYYY-MM-DD.
 */
function isoDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function parseRecipe(source, fallbackSlug) {
  const { data: fm, content } = matter(source)
  const body = parseBody(content)

  const recipe = {
    slug: fm.slug ?? fallbackSlug,
    title: fm.title ?? fallbackSlug,
    description: fm.description ?? '',
    category: fm.category ?? '',
    courses: list(fm.courses),
    cuisines: list(fm.cuisines),
    methods: list(fm.methods),
    restrictions: list(fm.restrictions),
    occasions: list(fm.occasions),
    ingredientTypes: list(fm.ingredientTypes),
    prepMinutes: num(fm.prepMinutes),
    cookMinutes: num(fm.cookMinutes),
    totalMinutes: num(fm.totalMinutes),
    yieldAmount: yieldAmount(fm.yieldAmount),
    yieldUnit: fm.yieldUnit ?? '',
    image: fm.image ?? '',
    created: isoDate(fm.created),
    ...body,
  }

  recipe.searchText = searchTextFor(recipe)
  return recipe
}

/** Read every fixture, newest first. */
export function loadRecipes(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => parseRecipe(readFileSync(join(dir, file), 'utf8'), file.replace(/\.md$/, '')))
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? '') || a.title.localeCompare(b.title))
}
