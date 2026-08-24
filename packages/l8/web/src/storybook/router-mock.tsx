import type React from 'react'

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  to?: string
  params?: Record<string, string | number | boolean | null | undefined>
  search?: Record<string, unknown>
}

function hrefFor(to = '#', params?: LinkProps['params'], search?: LinkProps['search']) {
  let href = to
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      href = href.replace(`$${key}`, String(value ?? ''))
    }
  }
  if (search && Object.keys(search).length) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(search)) {
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue
      if (Array.isArray(value)) {
        for (const item of value) query.append(key, String(item))
      } else {
        query.set(key, String(value))
      }
    }
    const qs = query.toString()
    if (qs) href += `?${qs}`
  }
  return href
}

export function Link({ to, params, search, children, ...props }: LinkProps) {
  return (
    <a href={hrefFor(to, params, search)} {...props}>
      {children}
    </a>
  )
}

export function useNavigate() {
  return async () => undefined
}

export function useRouterState() {
  return { location: { pathname: '/' } }
}

function routeFactory() {
  return {
    update: () => routeFactory(),
  }
}

export function createFileRoute() {
  return () => routeFactory()
}

export function createRootRoute() {
  return routeFactory()
}

export function createRouter() {
  return {
    navigate: async () => undefined,
  }
}

export function Await({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export function RouterProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export function notFound() {
  return new Error('Not found')
}

export function lazyRouteComponent() {
  return () => null
}

export function HeadContent() {
  return null
}

export function Outlet() {
  return null
}

export function Scripts() {
  return null
}
