import { useEffect, useRef, useState, type ReactNode } from 'react'

export type Token = { name: string; token: string; usage: string }

/** Storybook-only layout for the Foundations pages. */
export function FoundationPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return <div data-storybook="">
    <header data-storybook-header=""><p data-storybook-eyebrow="">Foundations</p><h1>{title}</h1><p>{intro}</p></header>
    {children}
  </div>
}

export function FoundationSection({ title, children }: { title: string; children: ReactNode }) {
  return <section data-storybook-section=""><h2>{title}</h2>{children}</section>
}

function useResolved(tokens: Token[]) {
  const ref = useRef<HTMLDivElement>(null)
  const [resolved, setResolved] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!ref.current) return
    const style = getComputedStyle(ref.current)
    setResolved(Object.fromEntries(tokens.map((t) => [t.token, style.getPropertyValue(t.token).trim()])))
  }, [tokens])
  return [ref, resolved] as const
}

export function Swatches({ tokens }: { tokens: Token[] }) {
  const [ref, resolved] = useResolved(tokens)
  return <div ref={ref} data-storybook-swatches="">
    {tokens.map((t) => <div key={t.token} data-storybook-swatch="">
      <span style={{ background: `var(${t.token})` }} />
      <strong>{t.name}</strong><code>{resolved[t.token] || t.token}</code><small>{t.usage}</small>
    </div>)}
  </div>
}

export function TokenTable({ tokens }: { tokens: Token[] }) {
  const [ref, resolved] = useResolved(tokens)
  return <div ref={ref} data-storybook-token-table="">
    {tokens.map((t) => <div key={t.token}><strong>{t.name}</strong><code>{t.token}</code><span>{resolved[t.token] || t.token}</span><small>{t.usage}</small></div>)}
  </div>
}
