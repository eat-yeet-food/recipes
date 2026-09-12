import { readFileSync } from 'node:fs'
import yaml from 'js-yaml'

// Build/Storybook source only; the Next.js runtime reads the synchronized Payload global.
const { sourceId, ...content } = yaml.safeLoad(readFileSync(new URL('./site.yaml', import.meta.url), 'utf8'))
export const app = { ...{
  "id": "eatyeet",
  "isDefault": true,
  "label": "Eat / Yeet",
  "siteUrl": "https://eatyeet.com",
  "cloudflareProject": "eatyeet",
  "doppler": {
    "project": "yeet",
    "config": "dev"
  },
  "staticPaths": [
    "/",
    "/recipes",
    "/browse",
    "/search",
    "/learn"
  ],
  "sitemapStaticPaths": [
    "/",
    "/recipes",
    "/browse",
    "/learn"
  ],
  "robotsDisallow": [
    "/search"
  ],
  "previewPaths": [
    "",
    "recipes",
    "search",
    "browse",
    "learn",
    "learn/mixing-dough-and-gluten-development",
    "recipes/new-york-style-pizza"
  ],
  "paths": {
    "fixtures": "apps/eatyeet/fixtures/recipes",
    "articleFixtures": "apps/eatyeet/fixtures/articles",
    "publicDir": "apps/eatyeet/public",
    "imagesDir": "apps/eatyeet/public/images",
    "generatedDir": "apps/eatyeet/generated"
  }
}, ...content }
export default app
