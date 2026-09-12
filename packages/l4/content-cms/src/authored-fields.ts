import type { Field } from 'payload'
import { createHash } from 'node:crypto'
import {
  recipeShape,
  articleShape,
  type Shape,
} from '@eat-yeet/l4-content-model/field-shapes'

export function authoredField(
  name: string,
  shape: Shape,
  path = name,
  inlineObject = false,
): Field {
  const dbName = ({ tableName = 'content' }: { tableName?: string }) =>
    `${tableName.slice(0, 14)}_${name.slice(0, 14)}_${createHash('sha256').update(`${tableName}:${path}`).digest('hex').slice(0, 10)}`
  const base = {
    name: name === 'id' ? 'authoredId' : name,
    ...(shape.label ? { label: shape.label } : {}),
    admin: { readOnly: true, ...(shape.hidden ? { hidden: true } : {}) },
  }
  if (shape.kind === 'object')
    return {
      ...base,
      ...(inlineObject || !shape.separateRow
        ? { type: 'group' as const }
        : { type: 'array' as const, maxRows: 1, dbName }),
      fields: [
        {
          name: 'authoredFields',
          type: 'text',
          admin: { hidden: true, readOnly: true },
        },
        ...Object.entries(shape.fields!).map(([key, value]) =>
          authoredField(key, value, `${path}.${key}`),
        ),
      ],
    }
  if (shape.kind === 'array' || shape.kind === 'map')
    return {
      ...base,
      type: 'array',
      dbName,
      admin: { ...base.admin, initCollapsed: true },
      fields: [
        ...(shape.kind === 'map'
          ? [
              {
                name: 'key',
                label: 'Reference',
                type: 'text',
                admin: { readOnly: true },
              } as Field,
            ]
          : []),
        authoredField('value', shape.item!, `${path}.value`, true),
      ],
    }
  return {
    ...base,
    type: shape.kind === 'amount' ? 'text' : shape.kind,
  } as Field
}

export function contentDetails(collection: string): Field {
  const shape = collection === 'recipes' ? recipeShape : articleShape
  const fields = Object.fromEntries(
    Object.entries(shape.fields!).map(([name, child]) => [
      name,
      authoredField(name, child),
    ]),
  )
  const take = (...names: string[]) =>
    names.filter((name) => fields[name]).map((name) => fields[name])
  return {
    name: 'details',
    type: 'group',
    label: false,
    admin: { readOnly: true },
    fields: [
      {
        name: 'authoredFields',
        type: 'text',
        admin: { hidden: true, readOnly: true },
      },
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Overview',
            fields: take(
              'description',
              'image',
              'created',
              'order',
              'type',
              'category',
              'tags',
              'courses',
              'cuisines',
              'methods',
              'restrictions',
              'occasions',
              'ingredientTypes',
            ),
          },
          ...(collection === 'recipes'
            ? [
                {
                  label: 'Timing & yield',
                  fields: take(
                    'prepMinutes',
                    'cookMinutes',
                    'totalMinutes',
                    'yieldAmount',
                    'yieldUnit',
                    'defaultMethod',
                  ),
                },
                { label: 'Learning references', fields: take('learning') },
                { label: 'Calculator defaults', fields: take('workbench') },
              ]
            : []),
        ],
      },
      ...take('searchText', 'imageHash', 'mediaReferences'),
    ],
  }
}
