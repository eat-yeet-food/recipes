import assert from 'node:assert/strict'
import { it } from 'node:test'
import { createGeneratedRecipeService } from './recipes.ts'
import { createGeneratedArticleService } from './articles.ts'
import { listGenerated } from './generated.ts'

it('retains recipe/article response contracts and only loads the requested body', async () => {
  let calls = 0
  const bodies = { '/content/one.json': async () => { calls++; return { default: { body: 'one' } } } }
  const recipes = createGeneratedRecipeService([], bodies, '/content')
  const articles = createGeneratedArticleService([], bodies, '/content')
  assert.deepEqual(await recipes.listRecipes(), { recipes: [] })
  assert.deepEqual(await articles.listArticles(), { articles: [] })
  assert.equal(calls, 0)
  assert.deepEqual(await recipes.getRecipe({ slug: 'missing' }), { recipe: null })
  assert.deepEqual(await articles.getArticle({ slug: 'missing' }), { article: null })
  assert.equal(calls, 0)
  assert.deepEqual(await recipes.getRecipe({ slug: 'one' }), { recipe: { body: 'one' } })
  assert.deepEqual(await articles.getArticle({ slug: 'one' }), { article: { body: 'one' } })
  assert.equal(calls, 2)
  const failed = createGeneratedRecipeService([], { '/content/bad.json': async () => { throw new Error('load failed') } }, '/content')
  await assert.rejects(failed.getRecipe({ slug: 'bad' }), /load failed/)
})

it('does not resolve inherited module loaders', async () => {
  const bodies = Object.create({ '/content/inherited.json': async () => ({ default: 'bad' }) })
  assert.deepEqual(await createGeneratedRecipeService([], bodies, '/content').getRecipe({ slug: 'inherited' }), { recipe: null })
})

it('retains static list limiting behavior without mutating the index', () => {
  const index = [{ slug: 'one' }, { slug: 'two' }]
  assert.deepEqual(listGenerated(index, { limit: 1 }), [index[0]])
  assert.equal(listGenerated(index), index)
  assert.equal(listGenerated(index, { limit: 0 }), index)
  assert.equal(listGenerated(index, { limit: -1 }), index)
  assert.equal(index.length, 2)
})
