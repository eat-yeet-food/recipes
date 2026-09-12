import { RootPage } from '@payloadcms/next/views'
import { redirect } from 'next/navigation'
import { cmsConfig } from '../../../../next/cms'
import { importMap } from '../importMap'
export const metadata = {
  title: 'Content administration | Eat / Yeet',
  robots: { index: false, follow: false },
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}) {
  const { segments = [] } = await params
  if (segments.includes('create-first-user')) {
    if (process.env.OWNER_EMAIL) redirect('/admin/login')
    return <p>Use the local owner:bootstrap command.</p>
  }
  return RootPage({ config: cmsConfig(), importMap, params, searchParams })
}
