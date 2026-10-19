import 'server-only'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { publicDocument, siteData } from '../../../next/cms'

// Test Kitchen pages hold a member's private formulas (loaded after hydration)
// or an unsaved calculator; neither is worth indexing.
export const kitchenMetadata = (title: string) => async (): Promise<Metadata> =>
  ({ title: `${title} | ${(await siteData()).siteName}`, robots: { index: false, follow: false } })

export type KitchenSearch = Promise<Record<string, string | string[] | undefined>>
export const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value

/** A published recipe that offers a calculator, as plain content for the client. */
export async function kitchenRecipeContent(slug: string) {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) notFound()
  const document = await publicDocument('recipes', slug)
  const content = document?.content as any
  if (!content?.workbench) notFound()
  return { ...content, searchText: '' }
}

export const validFormulaId = (id: string) => /^[A-Za-z0-9_-]{16}$/.test(id)
export const todayCount = (value: string | undefined) => {
  const count = Number(value)
  return Number.isInteger(count) && count >= 1 && count <= 99 ? count : undefined
}
