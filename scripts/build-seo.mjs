/**
 * Post-build: sitemap.xml, robots.txt, and Cloudflare Pages cache headers.
 *
 * These describe the built output, so they are written after prerendering
 * rather than served by a route — nothing runs at request time.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.output', 'public')
const SITE_URL = 'https://eatyeet.com'

if (!existsSync(OUT)) {
  console.error('No build output at .output/public — run vite build first.')
  process.exit(1)
}

const index = JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'index.json'), 'utf8'))

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Listing pages first, then every recipe. /search is deliberately absent: it is
 * one interactive page whose filters live in query params, and pointing a
 * crawler at it only competes with the recipe pages it links to.
 */
const urls = [
  { loc: '/' },
  { loc: '/recipes' },
  { loc: '/browse' },
  ...index.map((r) => ({ loc: `/recipes/${r.slug}`, lastmod: r.created })),
]

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.flatMap(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${escapeXml(SITE_URL + loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    '  </url>',
  ]),
  '</urlset>',
  '',
].join('\n')

const robots = `User-agent: *
Allow: /
Disallow: /search

Sitemap: ${SITE_URL}/sitemap.xml
`

/**
 * Vite fingerprints everything under /build, so those can be cached forever.
 * Images and fonts keep their plain names, so they get a day plus revalidation
 * rather than a year that no redeploy could clear.
 *
 * Pages applies *every* matching rule and merges the result, so `/*` carries
 * only the security headers. Adding a Cache-Control there produced the
 * self-contradicting `max-age=14400, immutable, must-revalidate` on hashed
 * assets. HTML is left to Pages' own default, which already revalidates.
 */
const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/build/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/images/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
`

writeFileSync(join(OUT, 'sitemap.xml'), sitemap)
writeFileSync(join(OUT, 'robots.txt'), robots)
writeFileSync(join(OUT, '_headers'), headers)

console.log(`seo: sitemap.xml (${urls.length} urls) + robots.txt + _headers`)
