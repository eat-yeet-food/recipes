/**
 * YAML fixtures -> plain recipe objects.
 *
 * Node-only. Inline Markdown is rendered to HTML here, at build time, so the
 * browser never needs a markdown parser — the shipped file carries plain data.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { marked } from 'marked'
import yaml from 'js-yaml'

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

/** Render one YAML display string as inline Markdown through a small allowlist. */
function renderMarkdown(value) {
  const tokens = marked.lexer(String(value ?? ''))
  return tokens
    .map((token) => {
      if (token.type === 'paragraph') return renderInlineTokens(token.tokens)
      if (token.type === 'text') return token.tokens ? renderInlineTokens(token.tokens) : token.text
      if (token.type === 'space') return ''
      return escapeHtml(token.raw ?? token.text ?? '')
    })
    .join(' ')
    .trim()
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

function normalizeSectioned(value) {
  return list(value)
    .map((section) => ({
      title: renderMarkdown(section?.title),
      items: list(section?.items).map(renderMarkdown).filter(Boolean),
    }))
    .filter((section) => section.title || section.items.length > 0)
}

function normalizeFlat(value) {
  return list(value).map(renderMarkdown).filter(Boolean)
}

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
  const data = yaml.load(source) ?? {}
  const sectioned = Object.fromEntries(
    [...SECTIONED].map((field) => [field, normalizeSectioned(data[field])]),
  )

  const recipe = {
    slug: data.slug ?? fallbackSlug,
    title: data.title ?? fallbackSlug,
    description: data.description ?? '',
    category: data.category ?? '',
    courses: list(data.courses),
    cuisines: list(data.cuisines),
    methods: list(data.methods),
    restrictions: list(data.restrictions),
    occasions: list(data.occasions),
    ingredientTypes: list(data.ingredientTypes),
    prepMinutes: num(data.prepMinutes),
    cookMinutes: num(data.cookMinutes),
    totalMinutes: num(data.totalMinutes),
    yieldAmount: yieldAmount(data.yieldAmount),
    yieldUnit: data.yieldUnit ?? '',
    image: data.image ?? '',
    created: isoDate(data.created),
    ...sectioned,
    notes: normalizeFlat(data.notes),
    tips: normalizeFlat(data.tips),
  }

  recipe.searchText = searchTextFor(recipe)
  return recipe
}

/** Read every fixture, newest first. */
export function loadRecipes(dir) {
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((file) => parseRecipe(readFileSync(join(dir, file), 'utf8'), file.replace(/\.ya?ml$/, '')))
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? '') || a.title.localeCompare(b.title))
}
