import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { ErrorState, NotFound } from './components/error-states'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    // Route-level defaults, so a route that forgets to declare these still
    // fails inside the site's own look rather than TanStack's bare panel.
    defaultErrorComponent: ErrorState,
    defaultNotFoundComponent: NotFound,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
