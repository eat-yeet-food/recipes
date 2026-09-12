import { marked } from 'marked'
import { isSafeUrl } from './markdown.mjs'
const blockTypes = new Set([
  'markdown',
  'image',
  'section',
  'callout',
  'steps',
  'comparison',
  'footnotes',
  'recipe',
  'youtube',
])
const fail = (path, message) => {
  throw new Error(`${path}: ${message}`)
}
export function validateAuthored(value, path = 'source', sectionDepth = 0) {
  if (typeof value === 'string') {
    const tokens = marked.lexer(value)
    marked.walkTokens(tokens, (token) => {
      if (token.type === 'html') fail(path, 'raw authored HTML is prohibited')
      if (['link', 'image'].includes(token.type) && !isSafeUrl(token.href))
        fail(path, 'unsafe Markdown URL')
    })
    return
  }
  if (Array.isArray(value)) {
    const ids = new Set()
    for (const [i, item] of value.entries()) {
      if (item?.id) {
        if (
          !['string', 'number'].includes(typeof item.id) ||
          ids.has(String(item.id))
        )
          fail(path, 'invalid or duplicate item identity')
        ids.add(String(item.id))
      }
      validateAuthored(item, `${path}[${i}]`, sectionDepth)
    }
    return
  }
  if (value?.type === 'section' && ++sectionDepth > 2)
    fail(path, 'section nesting exceeds the supported two levels')
  if (value && typeof value === 'object')
    for (const [key, v] of Object.entries(value)) {
      if (
        [
          'blocks',
          'ingredients',
          'equipment',
          'steps',
          'notes',
          'tips',
          'methodOptions',
          'courses',
          'cuisines',
          'methods',
          'restrictions',
          'occasions',
          'ingredientTypes',
          'tags',
        ].includes(key) &&
        !Array.isArray(v)
      )
        fail(path + '.' + key, 'expected an array')
      if (
        key === 'src' &&
        (typeof v !== 'string' ||
          !v ||
          typeof value.alt !== 'string' ||
          !value.alt)
      )
        fail(path, 'images require src and alt')
      if (key === 'blocks')
        for (const block of v) {
          if (!blockTypes.has(block?.type)) fail(path, 'unknown block type')
          if (
            block.type === 'image' &&
            !block.src &&
            !Array.isArray(block.images)
          )
            fail(path, 'image source required')
        }
      if (
        ['prepMinutes', 'cookMinutes', 'totalMinutes', 'order'].includes(key) &&
        v != null &&
        (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
      )
        fail(path + '.' + key, 'expected a nonnegative number')
      if (key === 'url' || key === 'href') {
        if (typeof v !== 'string' || !isSafeUrl(v))
          fail(path + '.' + key, 'unsafe URL')
      }
      validateAuthored(v, path + '.' + key, sectionDepth)
    }
}
