import type { Metadata } from 'next'
import { siteData } from '../../../next/cms'

// Account pages carry no content worth indexing.
export const accountMetadata = (title: string) => async (): Promise<Metadata> =>
  ({ title: `${title} | ${(await siteData()).siteName}`, robots: { index: false, follow: false } })
export type AccountSearch = Promise<Record<string, string | string[] | undefined>>
export const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? null : value ?? null
