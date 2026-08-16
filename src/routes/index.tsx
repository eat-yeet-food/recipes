import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '../components/home'
import { buildSeoMeta } from '../lib/seo'

export const Route = createFileRoute('/')({
  head: () =>
    buildSeoMeta({
      title: 'Eat / Yeet',
      description:
        'A curated collection of artisan recipes. No life stories, no SEO filler — just tested, refined recipes.',
      canonicalPath: '/',
    }),
  component: HomePage,
})
