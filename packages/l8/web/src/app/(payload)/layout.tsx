import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import { cmsConfig } from '../../next/cms'
import { importMap } from './admin/importMap'
import '@payloadcms/next/css'
export const dynamic = 'force-dynamic'
const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  return handleServerFunctions({ ...args, config: cmsConfig(), importMap })
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout
      config={cmsConfig()}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  )
}
