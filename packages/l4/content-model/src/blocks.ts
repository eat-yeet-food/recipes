export type PageBlock = MarkdownBlock | ImageBlock | RecipeBlock | YouTubeBlock

export interface Section {
  title: string
  items: string[]
}

export interface MarkdownBlock {
  type: 'markdown'
  html: string
}

export interface ImageBlock {
  type: 'image'
  layout: {
    mode: 'vertical' | 'flex' | 'grid'
    columns?: 1 | 2 | 3
  }
  images: Array<{
    src: string
    alt: string
    caption?: string
    imageHash?: string
  }>
}

export interface RecipeBlock {
  type: 'recipe'
  equipment: Section[]
  ingredients: Section[]
  steps: Section[]
  notes: string[]
  tips: string[]
}

export interface YouTubeBlock {
  type: 'youtube'
  id: string
  title: string
}
