import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Fragment } from 'react'

import { ErrorState, NotFound } from '@eat-yeet/l6-ui-shell/shell/error-states'
import { ApiQueryProvider } from '@eat-yeet/l3-api-query/provider'
import { createAppQueryClient, type QueryClient } from '@eat-yeet/l3-api-query/query-client'
import { routeTree } from './routeTree.gen'

export interface RouterContext {
  queryClient: QueryClient
}

export function getRouter() {
  const queryClient = createAppQueryClient()
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    context: { queryClient },
    // Route-level defaults, so a route that forgets to declare these still
    // fails inside the site's own look rather than TanStack's bare panel.
    defaultErrorComponent: ErrorState,
    defaultNotFoundComponent: NotFound,
  })

  const RouteWrap = router.options.Wrap ?? Fragment
  router.options.Wrap = ({ children }) => (
    <ApiQueryProvider client={queryClient}>
      <RouteWrap>{children}</RouteWrap>
    </ApiQueryProvider>
  )

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
