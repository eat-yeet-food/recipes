import type { ArticleIndex } from '@eat-yeet/l3-api-contract/articles'
import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'
import { createGeneratedArticleSeeds, createGeneratedArticleService } from '@eat-yeet/l3-api-static/articles'

const INDEX_FILE = '/apps/dpizzaoven/generated/articles/index.json'
const ARTICLE_DIR = '/apps/dpizzaoven/generated/articles'
const indexes = import.meta.glob<{ default: ArticleIndex }>('/apps/dpizzaoven/generated/articles/index.json', { eager: true })
const bodies = import.meta.glob<{ default: ArticleContent }>([
  '/apps/dpizzaoven/generated/articles/*.json',
  '!/apps/dpizzaoven/generated/articles/index.json',
])
const index = indexes[INDEX_FILE]?.default ?? []

export const articleStubService = createGeneratedArticleService(index, bodies, ARTICLE_DIR)
export const articleStubSeeds = createGeneratedArticleSeeds(index)
