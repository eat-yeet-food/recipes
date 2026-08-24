/**
 * Post-build: sitemap.xml, robots.txt, and Cloudflare Pages cache headers.
 *
 * These describe the built output, so they are written after prerendering
 * rather than served by a route — nothing runs at request time.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { allPaths, APP_ID, CLOUDFLARE_PROJECT, ROBOTS_DISALLOW, SITE_URL, sitemapPaths } from '#site-config'
import { RESOLVED_APP_PATHS } from './app-paths.mjs'
import { deploymentIdentity, writeDeployManifest } from './deploy-manifest.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, '.output', 'public')


if (!existsSync(OUT)) {
  console.error('No build output at .output/public — run vite build first.')
  process.exit(1)
}

const index = JSON.parse(readFileSync(join(RESOLVED_APP_PATHS.generatedDir, 'index.json'), 'utf8'))

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Listing pages first, then every recipe. /search is deliberately absent: it is
 * one interactive page whose filters live in query params, and pointing a
 * crawler at it only competes with the recipe pages it links to.
 */
const urls = sitemapPaths(index)

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
${ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`).join('\n')}

Sitemap: ${SITE_URL}/sitemap.xml
`

/**
 * Vite fingerprints everything under /build, so those get a year. Images and
 * fonts keep their plain names, so they get a day plus revalidation rather than
 * a year that no redeploy could clear.
 *
 * Pages applies *every* matching rule and merges the result, so `/*` carries
 * only the security headers. Adding a Cache-Control there produced the
 * self-contradicting `max-age=14400, immutable, must-revalidate` on hashed
 * assets. HTML is left to Pages' own default, which already revalidates.
 *
 * `/build/*` deliberately omits `immutable`, which the usual advice would add
 * for fingerprinted files. It bought us nothing — the filename already changes
 * with the content, so nothing revalidates in the normal case anyway — and it
 * cost a year-long outage. `immutable` tells a browser never to revalidate,
 * even on reload. When the edge briefly answered these URLs with an HTML body
 * during a deploy, every client that saw it was pinned to that body for a year,
 * reachable by no purge and no redeploy; only a hard reload cleared it.
 *
 * Without it a poisoned response self-heals on the next ordinary reload, at a
 * cost of one conditional request per asset per reload. That trade is not close
 * for an archive this size. See CLAUDE.md #6.
 *
 * HTML gets an explicit five-minute ceiling rather than Pages' default. These
 * documents name the hashed assets, so a stale one points a browser at a build
 * that may no longer be current — the exact shape of the outage. Five minutes
 * bounds how long any visitor can be pinned to a superseded build, and the
 * rules are generated from the same route list the prerenderer uses so they
 * cannot drift from the pages that actually exist. The rules are per-path on
 * purpose: a Cache-Control under `/*` would merge onto `/build/*` too.
 */
const PAGE_CACHE_CONTROL = 'public, max-age=300, must-revalidate'

const pageRules = allPaths(index)
  .map((path) => `${path}\n  Cache-Control: ${PAGE_CACHE_CONTROL}\n`)
  .join('\n')

const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/build/*
  Cache-Control: public, max-age=31536000

/fonts/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

/images/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800

${pageRules}`

writeFileSync(join(OUT, 'sitemap.xml'), sitemap)
writeFileSync(join(OUT, 'robots.txt'), robots)
writeFileSync(join(OUT, '_headers'), headers)
writeDeployManifest(OUT, deploymentIdentity({ appId: APP_ID, cloudflareProject: CLOUDFLARE_PROJECT, siteUrl: SITE_URL }))

console.log(`seo: sitemap.xml (${urls.length} urls) + robots.txt + _headers`)
