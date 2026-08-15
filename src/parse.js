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

const stripTags = (html) => html.replace(/<[^>]*>/g, '')

/** Render a list item's inline markdown, keeping links live. */
function renderItem(item) {
  const raw = item.text ?? ''
  return marked.parseInline(raw).trim()
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
    data.notes.map(stripTags).join(' '),
    data.tips.map(stripTags).join(' '),
  ]
    .join(' ')
    .toLowerCase()
}

const list = (value) => (Array.isArray(value) ? value : [])
const num = (value) => (typeof value === 'number' ? value : null)

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
    yieldAmount: num(fm.yieldAmount),
    yieldUnit: fm.yieldUnit ?? '',
    image: fm.image ?? '',
    created: fm.created ? String(fm.created).slice(0, 10) : '',
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
