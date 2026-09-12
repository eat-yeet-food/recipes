/** Shared, provider-independent shapes for authored metadata and calculator configuration. */
export type Shape = {
  kind:
    | 'text'
    | 'textarea'
    | 'number'
    | 'checkbox'
    | 'amount'
    | 'object'
    | 'array'
    | 'map'
  fields?: Record<string, Shape>
  item?: Shape
  label?: string
  hidden?: boolean
  separateRow?: boolean
}
const text: Shape = { kind: 'text' }
const number: Shape = { kind: 'number' }
const prose: Shape = { kind: 'textarea' }
const object = (fields: Record<string, Shape>): Shape => ({
  kind: 'object',
  fields,
})
const array = (item: Shape): Shape => ({ kind: 'array', item })
const map = (item: Shape): Shape => ({ kind: 'map', item })
const strings = array(text)
const flour = array(object({ id: text, name: text, percent: number }))
const formula = object({
  family: text,
  hydrationPercent: number,
  saltPercent: number,
  oilPercent: number,
  sugarPercent: number,
  maltPercent: number,
  yeastPercent: number,
  levainPercent: number,
  flour,
  starter: object({ hydrationPercent: number, flour }),
  process: object({
    mixingMethod: text,
    foldMethod: text,
    autolyseMinutes: number,
    saltDelayMinutes: number,
    bulkMinutes: number,
    folds: array(object({ id: text, atMinutes: number, method: text })),
  }),
})
export const workbenchShape = object({
  id: { ...text, label: 'Calculator' },
  config: object({
    defaultInputMode: text,
    doughIngredientSectionId: text,
    hiddenIngredientSectionIds: strings,
    perPieceIngredientLabel: text,
    perPieceIngredientQuantities: map(object({ quantity: number, unit: text })),
    pizzaSizing: object({
      referenceDiameterInches: number,
      referenceBallWeightGrams: number,
      diametersInches: array(number),
    }),
    initialWaterPercent: number,
    spiralMixer: object({
      name: text,
      initialRpm: number,
      initialMinutes: array(number),
      targetTemperatureF: number,
      saltRpm: number,
      saltMinutes: number,
      finishRpm: number,
      finishMinutes: number,
    }),
    processSections: object({ autolyse: text, bulk: text, levain: text }),
    defaultSelection: object({
      version: number,
      methodId: text,
      batch: object({
        count: number,
        pieceWeightGrams: number,
        diameterInches: number,
        pieceLabel: text,
      }),
      formula,
    }),
    recommendedFormulas: map(formula),
  }),
})
export const learningShape = object({
  mixing: object({
    defaultMethod: text,
    allowedMethods: strings,
    targetDevelopment: text,
    article: text,
    methodArticles: map(text),
  }),
  doughStrength: object({
    methods: strings,
    article: text,
    methodArticles: map(text),
  }),
  handling: array(object({ article: text, label: text })),
  finalDoughTemperature: object({
    targetF: number,
    rangeF: array(number),
    reason: prose,
    article: text,
  }),
})
export const timingFields = {
  prepMinutes: number,
  cookMinutes: number,
  totalMinutes: number,
  yieldAmount: { kind: 'amount', label: 'Yield amount' } as Shape,
  yieldUnit: text,
}
export const methodShape = object({
  label: text,
  description: prose,
  ...timingFields,
})
const commonFields = {
  description: prose,
  category: text,
  image: { ...text, label: 'Lead image source' },
  created: { ...text, label: 'Published date' },
  order: { ...number, label: 'Listing order' },
  imageHash: { ...text, hidden: true },
  searchText: { ...prose, hidden: true },
  mediaReferences: { ...map(text), hidden: true },
}
export const recipeShape = object({
  ...commonFields,
  ...timingFields,
  defaultMethod: text,
  courses: strings,
  cuisines: strings,
  methods: strings,
  restrictions: strings,
  occasions: strings,
  ingredientTypes: strings,
  learning: learningShape,
  workbench: workbenchShape,
})
export const articleShape = object({
  ...commonFields,
  type: text,
  tags: strings,
})
export const seoShape = object({
  title: text,
  description: prose,
  image: text,
  noindex: { kind: 'checkbox' },
})
export const detailsShape = object({
  ...recipeShape.fields,
  ...articleShape.fields,
})
// Isolate the two large optional groups without creating deeply nested SQL queries.
workbenchShape.separateRow = true
learningShape.separateRow = true

/** Keep nulls, absent fields, empty lists and numeric/text yields lossless across SQL.
 * Only the field-presence/type markers are internal; every value has its own typed field.
 */
export function encodeFields(shape: Shape, value: any, nested = false): any {
  if (value == null) {
    if (shape.kind === 'object')
      return shape.separateRow && nested
        ? []
        : {
            authoredFields: null,
            ...Object.fromEntries(
              Object.entries(shape.fields!).map(([key, child]) => [
                key === 'id' ? 'authoredId' : key,
                encodeFields(child, undefined, true),
              ]),
            ),
          }
    if (shape.kind === 'array' || shape.kind === 'map') return []
    return null
  }
  if (shape.kind === 'object') {
    for (const key of Object.keys(value))
      if (!(key in shape.fields!))
        throw new Error(`Unmodeled authored field: ${key}`)
    const present = Object.keys(value).filter((key) => value[key] !== undefined)
    const encoded = {
      authoredFields: present
        .map(
          (key) =>
            key +
            (value[key] === null
              ? ':null'
              : typeof value[key] === 'number' &&
                  shape.fields![key].kind === 'amount'
                ? ':number'
                : ''),
        )
        .join(','),
      ...Object.fromEntries(
        Object.entries(shape.fields!).map(([key, child]) => [
          key === 'id' ? 'authoredId' : key,
          encodeFields(child, value[key], true),
        ]),
      ),
    }
    return nested && shape.separateRow ? [encoded] : encoded
  }
  if (shape.kind === 'array')
    return value.map((item: any) => ({
      value: encodeFields(shape.item!, item),
    }))
  if (shape.kind === 'map')
    return Object.entries(value).map(([key, item]) => ({
      key,
      value: encodeFields(shape.item!, item),
    }))
  return shape.kind === 'amount' ? String(value) : value
}
export function decodeFields(shape: Shape, value: any): any {
  if (value == null) return undefined
  if (shape.kind === 'object') {
    if (Array.isArray(value)) value = value[0]
    if (!value) return undefined
    if (value.authoredFields == null) return undefined
    return Object.fromEntries(
      String(value.authoredFields)
        .split(',')
        .filter(Boolean)
        .map((entry) => {
          const [key, kind] = entry.split(':')
          const child = shape.fields![key]
          if (!child) throw new Error(`Unmodeled stored field: ${key}`)
          const item = value[key === 'id' ? 'authoredId' : key]
          return [
            key,
            kind === 'null'
              ? null
              : kind === 'number'
                ? Number(item)
                : decodeFields(child, item),
          ]
        }),
    )
  }
  if (shape.kind === 'array')
    return (value ?? []).map((item: any) =>
      decodeFields(shape.item!, item.value),
    )
  if (shape.kind === 'map')
    return Object.fromEntries(
      (value ?? []).map((item: any) => [
        item.key,
        decodeFields(shape.item!, item.value),
      ]),
    )
  return value
}
