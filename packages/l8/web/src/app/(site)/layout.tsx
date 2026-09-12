import { siteData, services, publicMedia, deliveryMedia } from '../../next/cms'
import { SiteShell } from '../../next/providers'
import '../../styles/global.css'
import '../../styles/site-overrides.css'
export const dynamic = 'force-dynamic'
export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const [site, media, api] = await Promise.all([
    siteData(),
    publicMedia(),
    services(),
  ])
  const { recipes } = await api.recipes.listRecipes()
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/donut-icon.svg" type="image/svg+xml" />
        <style>
          {
            ':root { --nav-h: 4rem; --header-offset: calc(var(--nav-h) + var(--impersonation-h, 0px)); }'
          }
        </style>
        <link
          rel="preload"
          href="/fonts/avenir/avenirnextltpro-medium-webfont.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/geller/typekit-geller-headline-bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <SiteShell site={site} media={deliveryMedia(media)} recipes={recipes}>
          {children}
        </SiteShell>
      </body>
    </html>
  )
}
