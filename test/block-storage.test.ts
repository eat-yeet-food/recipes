import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { parseRecipe, parseArticle } from '@eat-yeet/l4-content-build/parse'
import {
  encodeBlocks,
  decodeBlocks,
  toStoredRecord,
  storedContent,
} from '@eat-yeet/l4-content-model/storage'
test('recipes, methods and Learn articles round-trip the same reusable block contract', () => {
  for (const collection of ['recipes', 'articles'])
    for (const file of readdirSync(`apps/eatyeet/fixtures/${collection}`)) {
      const content = (collection === 'recipes' ? parseRecipe : parseArticle)(
        readFileSync(`apps/eatyeet/fixtures/${collection}/${file}`, 'utf8'),
        file,
      )
      const stored = toStoredRecord({ collection, data: { content } }).data
      assert.deepEqual(stored.content, {})
      assert(stored.details.description !== undefined)
      assert(stored.blocks.every((b: any) => b.blockType && !('type' in b)))
      assert.deepEqual(
        JSON.parse(JSON.stringify(storedContent(stored))),
        JSON.parse(JSON.stringify(content)),
        file,
      )
    }
})
test('Payload-owned block/array IDs never replace authored section and item identities', () => {
  const blocks: any = [
    {
      type: 'recipe',
      equipment: [],
      ingredients: [
        {
          id: 'dough',
          title: 'Dough',
          items: ['300 g flour'],
          itemIds: ['flour'],
        },
      ],
      steps: [],
      notes: [],
      tips: [],
    },
  ]
  const stored = encodeBlocks(blocks)
  stored[0].id = 'payload-block-id'
  stored[0].ingredients[0].id = 'payload-section-id'
  stored[0].ingredients[0].items[0].id = 'payload-item-id'
  assert.deepEqual(decodeBlocks(stored), blocks)
})
