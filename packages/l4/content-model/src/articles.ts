import type { ArticleSummary } from '@eat-yeet/l1-article-model/articles'
import type { PageBlock } from './blocks'

export type { ArticleSummary, ArticleType } from '@eat-yeet/l1-article-model/articles'

export interface ArticleContent extends ArticleSummary {
  blocks: PageBlock[]
}
