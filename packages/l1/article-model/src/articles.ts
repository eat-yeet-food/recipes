export type ArticleType = 'guide' | 'technique' | 'reference'

export interface ArticleSummary {
  slug: string
  title: string
  order: number | null
  description: string
  type: ArticleType
  category: string
  tags: string[]
  image: string
  imageHash: string
  created: string
  searchText: string
}

/**
 * The public URL for an article's lead image, or '' when it has none.
 */
export const articleImageUrl = (article: { image: string; imageHash?: string }) =>
  article.image ? `/images/${article.image}${article.imageHash ? `?v=${article.imageHash}` : ''}` : ''
