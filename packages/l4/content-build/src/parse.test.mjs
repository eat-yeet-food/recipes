import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { loadRecipes, parseRecipe } from './parse.mjs'

describe('parseRecipe blocks', () => {
  it('rejects legacy top-level recipe body fields', () => {
    assert.throws(() => parseRecipe(`
title: Pizza
ingredients:
  - title: Dough
    items:
      - "**500g** flour"
steps:
  - title: Bake
    items:
      - Bake hot.
`, 'pizza'), /recipe body fields must live under blocks/)
  })

  it('requires at least one valid block', () => {
    assert.throws(() => parseRecipe(`
title: Pizza
blocks:
  - type: image
    src: pizza-step.jpg
`, 'pizza'), /must define at least one valid block/)
  })

  it('normalizes variants into searchable recipe metadata', () => {
    const recipe = parseRecipe(`
title: Pizza
defaultVariant: outdoor
variants:
  - id: outdoor
    label: Outdoor Oven
  - id: indoor
    label: Indoor Steel
    description: Home oven bake
    cookMinutes: 7
    blocks:
      - type: recipe
        equipment:
          - Baking steel
        ingredients:
          - Flour
blocks:
  - type: recipe
    ingredients:
      - Flour
`, 'pizza')

    assert.equal(recipe.defaultVariant, 'outdoor')
    assert.equal(recipe.variants.length, 2)
    assert.equal(recipe.variants[0].label, 'Outdoor Oven')
    assert.equal(recipe.variants[0].blocks, recipe.blocks)
    assert.equal(recipe.variants[1].cookMinutes, 7)
    assert.equal(recipe.searchText.includes('outdoor oven'), true)
    assert.equal(recipe.searchText.includes('indoor steel'), true)
    assert.equal(recipe.searchText.includes('baking steel'), true)
  })

  it('loads recipes by explicit order before falling back to created date', () => {
    const dir = mkdtempSync(join(tmpdir(), 'recipes-order-'))

    try {
      writeFileSync(join(dir, 'newer.yaml'), `
title: Newer
created: '2026-01-01'
blocks:
  - type: recipe
    ingredients:
      - Flour
`)
      writeFileSync(join(dir, 'first.yaml'), `
title: First
order: 1
created: '2025-01-01'
blocks:
  - type: recipe
    ingredients:
      - Flour
`)
      writeFileSync(join(dir, 'second.yaml'), `
title: Second
order: 2
created: '2026-02-01'
blocks:
  - type: recipe
    ingredients:
      - Flour
`)

      assert.deepEqual(loadRecipes(dir).map((recipe) => recipe.slug), ['first', 'second', 'newer'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('renders standard markdown blocks through the safe block allowlist', () => {
    const recipe = parseRecipe(`
title: Pizza
blocks:
  - type: markdown
    markdown: |
      ## Starter

      Use **ripe** starter and [safe links](https://example.com).

      <script>alert("nope")</script>
      [bad](javascript:alert(1))
`, 'pizza')

    assert.equal(recipe.blocks[0].type, 'markdown')
    assert.match(recipe.blocks[0].html, /<h2>Starter<\/h2>/)
    assert.match(recipe.blocks[0].html, /<strong>ripe<\/strong>/)
    assert.match(recipe.blocks[0].html, /<a href="https:\/\/example.com">safe links<\/a>/)
    assert.doesNotMatch(recipe.blocks[0].html, /<script>/)
    assert.doesNotMatch(recipe.blocks[0].html, /javascript:/)
  })

  it('normalizes image block layout and captions', () => {
    const recipe = parseRecipe(`
title: Pizza
blocks:
  - type: image
    layout:
      mode: grid
      columns: 2
    images:
      - src: pizza-step.jpg
        alt: Pizza on a peel
        caption: "**Launch** quickly."
`, 'pizza')

    assert.deepEqual(recipe.blocks[0], {
      type: 'image',
      layout: { mode: 'grid', columns: 2 },
      images: [
        {
          src: 'pizza-step.jpg',
          alt: 'Pizza on a peel',
          caption: '<strong>Launch</strong> quickly.',
        },
      ],
    })
    assert.equal(recipe.searchText.includes('pizza on a peel launch quickly'), true)
  })

  it('drops image blocks that do not carry accessible alt text', () => {
    const recipe = parseRecipe(`
title: Pizza
blocks:
  - type: image
    layout: null
    images:
      - src: pizza-step.jpg
  - type: recipe
    ingredients:
      - items:
          - Flour
`, 'pizza')

    assert.equal(recipe.blocks.length, 1)
    assert.equal(recipe.blocks[0].type, 'recipe')
  })

  it('keeps recipe block nested markdown as inline recipe HTML', () => {
    const recipe = parseRecipe(`
title: Pizza
blocks:
  - type: recipe
    ingredients:
      - title: Sauce
        items:
          - "Crush **tomatoes**"
    steps:
      - title: Finish
        items:
          - "Bake until _spotted_."
`, 'pizza')

    assert.equal(recipe.blocks[0].type, 'recipe')
    assert.equal(recipe.blocks[0].ingredients[0].items[0], 'Crush <strong>tomatoes</strong>')
    assert.equal(recipe.blocks[0].steps[0].items[0], 'Bake until <em>spotted</em>.')
  })

  it('accepts flat strings in sectioned recipe fields', () => {
    const recipe = parseRecipe(`
title: Pizza
blocks:
  - type: recipe
    equipment:
      - "**Baking** steel"
    ingredients:
      - title: Dough
        items:
          - Flour
    steps:
      - title: Bake
        items:
          - Bake hot.
`, 'pizza')

    assert.equal(recipe.blocks[0].equipment[0].items[0], '<strong>Baking</strong> steel')
    assert.equal(recipe.searchText.includes('baking steel'), true)
  })

  it('normalizes YouTube blocks by id', () => {
    const recipe = parseRecipe(`
title: Pizza
blocks:
  - type: youtube
    id: abc_123-xyz
    title: Shaping pizza
  - type: youtube
    id: empty_title
    title: ""
  - type: youtube
    id: "https://youtube.com/watch?v=bad"
    title: Bad
`, 'pizza')

    assert.deepEqual(recipe.blocks, [
      { type: 'youtube', id: 'abc_123-xyz', title: 'Shaping pizza' },
      { type: 'youtube', id: 'empty_title', title: 'Recipe video' },
    ])
    assert.equal(recipe.searchText.includes('shaping pizza'), true)
  })
})
