export type PageBlock =
  | MarkdownBlock
  | ImageBlock
  | SectionBlock
  | CalloutBlock
  | StepsBlock
  | ComparisonBlock
  | FootnotesBlock
  | RecipeBlock
  | YouTubeBlock

export interface Section {
  id: string
  title: string
  items: string[]
  itemIds: string[]
  /** Render-time projection only, never stored: elapsed time for each step of a timed process. */
  itemTimes?: SectionItemTime[]
  /** What itemTimes count from, e.g. `Time since mixing in the levain`. */
  timeOrigin?: string
  /** Ingredient sections: an optional short name per item that steps reference (`ref: butter`); '' when absent. */
  itemRefs?: string[]
  /** Step sections: the ingredients each step uses, by ingredient item ID; [] when the step lists none. */
  itemUses?: StepUse[][]
}

/** One ingredient a step uses. `amount` is this step's share of a divided ingredient. */
export interface StepUse {
  /** The ingredient's item ID in the same recipe block. */
  id: string
  amount?: string
  /** Replaces the name derived from the ingredient text. */
  label?: string
}

export interface SectionItemTime {
  /** Display label, e.g. `10m` or `1:30h`. */
  label: string
  minutes: number
  /** Steps that change the dough's state get a filled marker. */
  emphasis?: boolean
  /** Muted line under the step, e.g. how long to rest. */
  rest?: string
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

export interface FootnotesBlock {
  type: 'footnotes'
  title: string
  items: Array<{
    id: string
    html: string
    url: string
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
