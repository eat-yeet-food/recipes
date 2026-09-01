export type PageBlock =
  | MarkdownBlock
  | ImageBlock
  | SectionBlock
  | CalloutBlock
  | StepsBlock
  | ComparisonBlock
  | RecipeBlock
  | YouTubeBlock

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
    aspect?: 'natural' | 'landscape' | 'square' | 'portrait'
  }
  images: Array<{
    src: string
    alt: string
    caption?: string
    imageHash?: string
  }>
}

export interface SectionBlock {
  type: 'section'
  layout: 'prose' | 'split' | 'feature'
  columns: Array<{
    blocks: PageBlock[]
  }>
}

export interface CalloutBlock {
  type: 'callout'
  tone: 'note' | 'tip' | 'warning'
  title: string
  html: string
}

export interface StepsBlock {
  type: 'steps'
  title: string
  headingLevel?: 2 | 3
  items: Array<{
    title: string
    html: string
  }>
}

export interface ComparisonBlock {
  type: 'comparison'
  title: string
  columns: string[]
  rows: Array<{
    label: string
    values: string[]
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
