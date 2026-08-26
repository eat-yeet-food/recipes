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
    browseEyebrow: string
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
    learnTitle: string
    learnHeading: string
    learnDescription: string
    learnIntro: string
    recipeFallbackTitle: string
    recipeTitleSuffix: string
    articleFallbackTitle: string
    articleTitleSuffix: string
  }
  jsonLdAuthor: string
}

export interface AppPaths {
  fixtures: string
  articleFixtures?: string
  publicDir: string
  imagesDir: string
  generatedDir: string
}

export interface RecipeApp {
  id: string
  isDefault?: boolean
  label: string
  siteName: string
  siteUrl: string
  cloudflareProject: string
  doppler: {
    project: string
    config: string
  }
  defaultOgImage: string
  categories: Category[]
  copy: AppCopy
  staticPaths: string[]
  sitemapStaticPaths: string[]
  robotsDisallow: string[]
  previewPaths: string[]
  paths: AppPaths
}

export interface SitemapRecipe {
  slug: string
  created?: string
}

export interface SitemapArticle {
  slug: string
  created?: string
}

export interface SitemapEntry {
  loc: string
  lastmod?: string
}

export const DEFAULT_APP_ID: string
export const APP_ID: string
export const ACTIVE_APP: RecipeApp
export const SITE_URL: string
export const SITE_NAME: string
export const DEFAULT_OG_IMAGE: string
export const STATIC_PATHS: string[]
export const SITEMAP_STATIC_PATHS: string[]
export const ROBOTS_DISALLOW: string[]
export const CLOUDFLARE_PROJECT: string
export const DOPPLER: {
  project: string
  config: string
}
export const PREVIEW_PATHS: string[]
export const APP_PATHS: AppPaths
export const APP_COPY: AppCopy
export const APP_CATEGORIES: Category[]
export function allPaths(index: SitemapRecipe[], articles?: SitemapArticle[]): string[]
export function sitemapPaths(index: SitemapRecipe[], articles?: SitemapArticle[]): SitemapEntry[]
