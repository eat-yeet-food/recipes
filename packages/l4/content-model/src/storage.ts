import type { PageBlock } from './blocks'
import {
  encodeFields,
  decodeFields,
  recipeShape,
  articleShape,
  detailsShape,
  methodShape,
  seoShape,
} from './field-shapes.ts'
/** Translate provider block discriminators and array IDs at the storage boundary. */
export function encodeBlocks(blocks: PageBlock[]): any[] {
  return blocks.map((block: any) => {
    const { type, ...fields } = block
    if (type === 'recipe')
      for (const key of ['equipment', 'ingredients', 'steps'])
        fields[key] = fields[key].map(({ id, title, items, itemIds }: any) => ({
          sectionId: id,
          title,
          items: items.map((html: string, i: number) => ({
            itemId: itemIds[i],
            html,
          })),
        }))
    if (type === 'recipe')
      for (const key of ['notes', 'tips'])
        fields[key] = fields[key].map((html: string) => ({ html }))
    if (type === 'section')
      fields.columns = fields.columns.map((column: any) => ({
        blocks: encodeBlocks(column.blocks),
      }))
    if (type === 'comparison') {
      fields.columns = fields.columns.map((html: string) => ({ html }))
      fields.rows = fields.rows.map((row: any) => ({
        ...row,
        values: row.values.map((html: string) => ({ html })),
      }))
    }
    if (type === 'footnotes')
      fields.items = fields.items.map(({ id, ...item }: any) => ({
        itemId: String(id),
        ...item,
      }))
    if (type === 'youtube') {
      fields.videoId = fields.id
      delete fields.id
    }
    return { blockType: type, ...fields }
  })
}
export function decodeBlocks(blocks: any[] = []): PageBlock[] {
  return (blocks ?? []).map((block) => {
    const { blockType, id, blockName, ...fields } = block

    const clean = (value: any): any =>
      Array.isArray(value)
        ? value.map(clean)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .filter(([k]) => k !== 'id')
                .map(([k, v]) => [k, clean(v)]),
            )
          : value
    const data = clean(fields)
    if (blockType === 'recipe') {
      for (const key of ['equipment', 'ingredients', 'steps'])
        data[key] = (fields[key] ?? []).map((section: any) => ({
          id: section.sectionId,
          title: section.title ?? '',
          items: (section.items ?? []).map((i: any) => i.html),
          itemIds: (section.items ?? []).map((i: any) => i.itemId),
        }))
      for (const key of ['notes', 'tips'])
        data[key] = (fields[key] ?? []).map((i: any) => i.html)
    }
    if (blockType === 'section')
      data.columns = (fields.columns ?? []).map((column: any) => ({
        blocks: decodeBlocks(column.blocks),
      }))
    if (blockType === 'comparison') {
      data.columns = (fields.columns ?? []).map((i: any) => i.html)
      data.rows = (fields.rows ?? []).map((row: any) => ({
        label: row.label,
        values: (row.values ?? []).map((i: any) => i.html),
      }))
    }
    if (blockType === 'footnotes')
      data.items = (fields.items ?? []).map((i: any) => ({
        id: i.itemId,
        html: i.html,
        url: i.url,
      }))
    if (blockType === 'image') {
      data.layout = Object.fromEntries(
        Object.entries(data.layout ?? {}).filter(([, v]) => v != null),
      )
      data.images = (data.images ?? []).map((i: any) =>
        Object.fromEntries(Object.entries(i).filter(([, v]) => v != null)),
      )
    }
    if (blockType === 'youtube') {
      data.id = fields.videoId
      delete data.videoId
    }
    if (blockType === 'steps' && data.headingLevel == null)
      delete data.headingLevel
    return { type: blockType, ...data }
  }) as PageBlock[]
}
export function toStoredRecord(record: any) {
  if (!['recipes', 'articles'].includes(record.collection)) return record
  const { content, seo, ...managed } = record.data
  const { blocks, methodOptions, title, slug, ...metadata } = content
  return {
    ...record,
    data: {
      ...managed,
      // Keep legacy columns for old revisions; synchronized values use typed fields.
      content: {},
      seo: null,
      title,
      slug,
      details: encodeFields(
        record.collection === 'recipes' ? recipeShape : articleShape,
        metadata,
      ),
      searchAppearance: encodeFields(seoShape, seo),
      blocks: encodeBlocks(blocks),
      ...(record.collection === 'recipes'
        ? {
            methodOptions: (methodOptions ?? []).map(
              ({ id, blocks, ...metadata }: any) => ({
                methodId: id,
                metadata: {},
                details: encodeFields(methodShape, metadata),
                blocks: encodeBlocks(blocks),
              }),
            ),
          }
        : {}),
    },
  }
}
export function storedContent(doc: any) {
  return {
    ...(doc.details?.authoredFields != null
      ? {
          ...decodeFields(detailsShape, doc.details),
          title: doc.title,
          slug: doc.slug,
        }
      : doc.content),
    blocks: decodeBlocks(doc.blocks),
    ...(doc.methodOptions
      ? {
          methodOptions: doc.methodOptions.map((method: any) => ({
            id: method.methodId,
            ...(decodeFields(methodShape, method.details) ?? method.metadata),
            blocks: decodeBlocks(method.blocks),
          })),
        }
      : {}),
  }
}
export function semanticStoredField(key: string, value: any) {
  if (key === 'details') return decodeFields(detailsShape, value)
  if (key === 'searchAppearance') return decodeFields(seoShape, value) ?? null
  if (key === 'blocks') return decodeBlocks(value)
  if (key === 'methodOptions')
    return (value ?? []).map((m: any) => ({
      id: m.methodId,
      ...(decodeFields(methodShape, m.details) ?? m.metadata),
      blocks: decodeBlocks(m.blocks),
    }))
  return value
}
export const storedSEO = (doc: any) =>
  doc.details?.authoredFields != null
    ? (decodeFields(seoShape, doc.searchAppearance) ?? null)
    : doc.seo
