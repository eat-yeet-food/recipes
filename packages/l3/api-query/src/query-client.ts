import { MutationCache, QueryClient } from '@tanstack/react-query'

export type { QueryClient }

export function createAppQueryClient() {
  const isServer = typeof window === 'undefined'

  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => {
        console.error('Mutation failed', error)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: isServer ? Infinity : 300_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}
