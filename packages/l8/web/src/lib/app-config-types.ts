import type { Category } from '@eat-yeet/l3-api-contract/categories'

export interface AppCopy {
  description: string
  wordmark: {
    first: string
    second: string
    background: string
  }
  hero: {
    image: string
    imageAlt: string
    tagline: string
    cta: string
  }
  home: {
    eyebrow: string
    latestTitle: string
    browseTitle: string
  }
  pages: {
    homeTitle: string
    recipesTitle: string
    recipesHeading: string
    recipesDescription: string
    recipesIntro: string
    browseTitle: string
    browseHeading: string
    browseDescription: string
    browseIntro: string
    searchTitle: string
    searchDescription: string
    recipeFallbackTitle: string
    recipeTitleSuffix: string
  }
  jsonLdAuthor: string
}

export interface PublicAppConfig {
  id: string
  siteName: string
  siteUrl: string
  defaultOgImage: string
  copy: AppCopy
  categories: Category[]
}
