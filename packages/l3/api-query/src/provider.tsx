import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export function ApiQueryProvider({
  children,
  client,
}: {
  children: ReactNode
  client: QueryClient
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
