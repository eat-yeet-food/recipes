import { semanticStoredField } from '@eat-yeet/l4-content-model/storage'
import { createHash } from 'node:crypto'
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, stable(value[k])]),
    )
  return value
}
export const canonical = (value) => JSON.stringify(stable(value))
export const hashContent = (value) =>
  createHash('sha256').update(canonical(value)).digest('hex')
export async function planUpserts(payload, records) {
  const result = []
  for (const { collection, data } of records) {
    const { docs } = await payload.find({
      collection,
      overrideAccess: true,
      depth: 0,
      limit: 2,
      where: { sourceId: { equals: data.sourceId } },
    })
    if (docs.length > 1)
      throw new Error(`Duplicate stored identity ${data.sourceId}`)
    const old = docs[0]
    if (old && old.slug !== data.slug)
      throw new Error(`Slug changes are deferred: ${data.sourceId}`)
    const managed = Object.keys(data).filter((k) => k !== 'gitRevision')
    const changed =
      !old ||
      managed.some(
        (k) =>
          canonical(semanticStoredField(k, old[k] ?? null)) !==
          canonical(semanticStoredField(k, data[k] ?? null)),
      )
    result.push({
      collection,
      data,
      id: old?.id,
      action: !old
        ? 'create'
        : changed
          ? data.status === 'archived'
            ? 'retired'
            : 'update'
          : 'unchanged',
    })
  }
  return result
}
export async function applyUpserts(payload, plan) {
  for (const item of plan) {
    if (item.action === 'create')
      await payload.create({
        collection: item.collection,
        data: item.data,
        overrideAccess: true,
      })
    if (['update', 'retired'].includes(item.action))
      await payload.update({
        collection: item.collection,
        id: item.id,
        data: item.data,
        overrideAccess: true,
      })
  }
}
