'use client'
import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react'
export type Destination = {
  to?: string
  params?: Record<string, string | number | boolean | null | undefined>
  search?: Record<string, unknown>
  replace?: boolean
}
export function hrefFor({ to = '/', params, search }: Destination) {
  let href = to
  for (const [key, value] of Object.entries(params ?? {}))
    href = href.replace(`$${key}`, encodeURIComponent(String(value ?? '')))
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(search ?? {}))
    if (
      value != null &&
      value !== '' &&
      (!Array.isArray(value) || value.length)
    )
      query.set(key, Array.isArray(value) ? value.join(',') : String(value))
  return href + (query.size ? '?' + query : '')
}
const Navigation = createContext<(destination: Destination) => void>((d) => {
  if (typeof window !== 'undefined') window.location.assign(hrefFor(d))
})
export function NavigationProvider({
  navigate,
  children,
}: {
  navigate: (destination: Destination) => void
  children: ReactNode
}) {
  return <Navigation.Provider value={navigate}>{children}</Navigation.Provider>
}
export const useNavigate = () => useContext(Navigation)
export function Link({
  to,
  params,
  search,
  children,
  onClick,
  ...props
}: Destination & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const navigate = useNavigate()
  const href = hrefFor({ to, params, search })
  return (
    <a
      {...props}
      href={href}
      onClick={(e) => {
        onClick?.(e)
        if (
          !e.defaultPrevented &&
          e.button === 0 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          !props.target &&
          href.startsWith('/')
        ) {
          e.preventDefault()
          navigate({ to, params, search })
        }
      }}
    >
      {children}
    </a>
  )
}
