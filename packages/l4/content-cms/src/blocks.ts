import type { Block, Field } from 'payload'
import { methodShape } from '@eat-yeet/l4-content-model/field-shapes'
import { authoredField } from './authored-fields'
const text = (name: string, required = false): Field => ({
  name,
  type: 'text',
  required,
})
const html = (name = 'html'): Field => ({ name, type: 'textarea' })
const list = (name: string, fields: Field[]): Field => ({
  name,
  type: 'array',
  fields: structuredClone(fields),
})
const choice = (name: string, options: string[]): Field => ({
  name,
  type: 'select',
  options,
})
const sectionFields: Field[] = [
  text('sectionId', true),
  text('title'),
  list('items', [text('itemId', true), html()]),
]
/** The same blocks back Learn articles, recipes and recipe method variants. */
export function contentBlocks(name = 'blocks', depth = 0): Field {
  const blocks: Block[] = [
    { slug: 'markdown', fields: [html()] },
    {
      slug: 'image',
      fields: [
        {
          name: 'layout',
          type: 'group',
          fields: [
            choice('mode', ['vertical', 'flex', 'grid']),
            choice('aspect', ['natural', 'landscape', 'square', 'portrait']),
            { name: 'columns', type: 'number', min: 1, max: 3 },
          ],
        },
        list('images', [text('src', true), text('alt', true), html('caption')]),
      ],
    },
    {
      slug: 'callout',
      fields: [
        text('title'),
        choice('tone', ['note', 'tip', 'warning']),
        html(),
      ],
    },
    {
      slug: 'steps',
      fields: [
        text('title'),
        { name: 'headingLevel', type: 'number', min: 3, max: 3 },
        list('items', [text('title'), html()]),
      ],
    },
    {
      slug: 'comparison',
      fields: [
        text('title'),
        list('columns', [html()]),
        list('rows', [text('label'), list('values', [html()])]),
      ],
    },
    {
      slug: 'footnotes',
      fields: [
        text('title'),
        list('items', [text('itemId', true), html(), text('url', true)]),
      ],
    },
    {
      slug: 'recipe',
      fields: [
        ...['equipment', 'ingredients', 'steps'].map((key) =>
          list(key, sectionFields),
        ),
        ...['notes', 'tips'].map((key) => list(key, [html()])),
      ],
    },
    { slug: 'youtube', fields: [text('videoId', true), text('title', true)] },
  ]
  // SQL-backed blocks need finite nesting. Current authored sections use one level.
  if (depth < 2)
    blocks.push({
      slug: 'section',
      fields: [
        choice('layout', ['prose', 'split', 'feature']),
        list('columns', [contentBlocks('blocks', depth + 1)]),
      ],
    })
  return { name, type: 'blocks', blocks, admin: { readOnly: true } }
}
export const methodOptions: Field = {
  name: 'methodOptions',
  type: 'array',
  admin: { readOnly: true },
  fields: [
    text('methodId', true),
    {
      name: 'metadata',
      type: 'json',
      required: true,
      admin: { hidden: true, readOnly: true },
    },
    authoredField('details', methodShape, 'methodDetails', true),
    contentBlocks(),
  ],
}
