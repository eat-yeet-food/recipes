/** Build-time Markdown allowlist. No raw authored HTML reaches the view models. */
import { marked } from 'marked'

const SAFE_URL_BASE = 'https://example.com'

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
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '\uFFFD'
  })

export const stripTags = (html) => decodeEntities(html.replace(/<[^>]*>/g, ''))

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const isSafeUrl = (href) => {
  try {
    const url = new URL(href, SAFE_URL_BASE)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

const linkAttributes = (href) => {
  const target = /^(https?:)?\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''
  return `href="${escapeHtml(href)}"${target}`
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
        const footnote = token.href.match(/^#footnote-([\w-]+)$/)
        if (footnote) {
          const id = escapeHtml(footnote[1])
          return `<sup id="footnote-ref-${id}"><a href="#footnote-${id}" aria-label="Source ${escapeHtml(stripTags(text))}">${text}</a></sup>`
        }
        return `<a ${linkAttributes(token.href)}>${text}</a>`
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
export function renderMarkdown(value) {
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

function renderBlockTokens(tokens = []) {
  return tokens.map((token) => {
    switch (token.type) {
      case 'space':
        return ''
      case 'paragraph':
        return `<p>${renderInlineTokens(token.tokens)}</p>`
      case 'heading': {
        const depth = Math.min(Math.max(token.depth, 2), 4)
        return `<h${depth}>${renderInlineTokens(token.tokens)}</h${depth}>`
      }
      case 'list': {
        const Tag = token.ordered ? 'ol' : 'ul'
        const items = token.items
          .map((item) => `<li>${renderBlockTokens(item.tokens).join('')}</li>`)
          .join('')
        return `<${Tag}>${items}</${Tag}>`
      }
      case 'blockquote':
        return `<blockquote>${renderBlockTokens(token.tokens).join('')}</blockquote>`
      case 'hr':
        return '<hr>'
      case 'text':
        return `<p>${token.tokens ? renderInlineTokens(token.tokens) : escapeHtml(token.text)}</p>`
      default:
        return `<p>${escapeHtml(token.raw ?? token.text ?? '')}</p>`
    }
  })
}

export function renderMarkdownBlock(value) {
  return renderBlockTokens(marked.lexer(String(value ?? ''))).join('').trim()
}

