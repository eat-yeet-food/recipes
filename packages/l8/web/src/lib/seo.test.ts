import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildSeoMeta } from './seo.ts'

const TEST_APP_CONFIG = {
  id: 'test',
  siteName: 'Test Kitchen',
  siteUrl: 'https://example.test',
  defaultOgImage: '/images/default.jpg',
  copy: {
    description: '',
    wordmark: { first: 'Test', second: 'Kitchen', background: 'TEST' },
    hero: { image: '', imageAlt: '', tagline: '', cta: '' },
    home: { eyebrow: '', latestTitle: '', browseEyebrow: '', browseTitle: '' },
    pages: {
      homeTitle: '',
      recipesTitle: '',
      recipesHeading: '',
      recipesDescription: '',
      recipesIntro: '',
      browseTitle: '',
      browseHeading: '',
      browseDescription: '',
      browseIntro: '',
      searchTitle: '',
      searchDescription: '',
      recipeFallbackTitle: '',
      recipeTitleSuffix: '',
    },
    jsonLdAuthor: '',
  },
  categories: [],
}

const { defaultOgImage: DEFAULT_OG_IMAGE, siteName: SITE_NAME, siteUrl: SITE_URL } = TEST_APP_CONFIG

describe('buildSeoMeta', () => {
  it('emits the OpenGraph and Twitter tag contract in order', () => {
    const result = buildSeoMeta({
      title: 'Recipe',
      description: 'A test recipe',
      canonicalPath: '/recipes/pizza',
      ogType: 'article',
      ogImage: '/images/pizza.jpg',
    }, TEST_APP_CONFIG)

    assert.deepEqual(result.meta, [
      { title: 'Recipe' },
      { name: 'description', content: 'A test recipe' },
      { property: 'og:title', content: 'Recipe' },
      { property: 'og:description', content: 'A test recipe' },
      { property: 'og:url', content: `${SITE_URL}/recipes/pizza` },
      { property: 'og:type', content: 'article' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:image', content: `${SITE_URL}/images/pizza.jpg` },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Recipe' },
      { name: 'twitter:description', content: 'A test recipe' },
      { name: 'twitter:image', content: `${SITE_URL}/images/pizza.jpg` },
    ])
    assert.deepEqual(result.links, [
      { rel: 'canonical', href: `${SITE_URL}/recipes/pizza` },
    ])
  })

  it('keeps absolute image URLs untouched', () => {
    const result = buildSeoMeta({
      title: 'Recipe',
      description: 'desc',
      canonicalPath: '/recipes/pizza',
      ogImage: 'https://cdn.example.test/pizza.jpg',
    }, TEST_APP_CONFIG)

    assert.deepEqual(result.meta.find((meta) => meta.property === 'og:image'), {
      property: 'og:image',
      content: 'https://cdn.example.test/pizza.jpg',
    })
    assert.deepEqual(result.meta.find((meta) => meta.name === 'twitter:image'), {
      name: 'twitter:image',
      content: 'https://cdn.example.test/pizza.jpg',
    })
  })

  it('uses the archive hero when a route has no route-specific image', () => {
    const result = buildSeoMeta({
      title: 'Home',
      description: 'desc',
      canonicalPath: '/',
    }, TEST_APP_CONFIG)

    assert.deepEqual(result.meta.find((meta) => meta.property === 'og:image'), {
      property: 'og:image',
      content: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    })
    assert.deepEqual(result.meta.find((meta) => meta.name === 'twitter:image'), {
      name: 'twitter:image',
      content: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
    })
  })

  it('sets noindex only when requested', () => {
    const indexed = buildSeoMeta({
      title: 'Home',
      description: 'desc',
      canonicalPath: '/',
    }, TEST_APP_CONFIG)
    const noindex = buildSeoMeta({
      title: 'Search',
      description: 'desc',
      canonicalPath: '/search',
      noindex: true,
    }, TEST_APP_CONFIG)

    assert.equal(indexed.meta.find((m) => m.name === 'robots'), undefined)
    assert.deepEqual(noindex.meta.find((m) => m.name === 'robots'), {
      name: 'robots',
      content: 'noindex, follow',
    })
  })
})
