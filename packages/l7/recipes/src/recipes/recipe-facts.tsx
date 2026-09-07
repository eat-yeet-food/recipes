/** Passive recipe facts: compact typography and rules on the reading surface. */
export function RecipeFacts({ items }: { items: readonly (readonly [string, string])[] }) {
  return <dl className="mt-0 mb-7 grid grid-cols-2 gap-x-6 border-b border-border text-ink max-[360px]:grid-cols-1 xl:grid-cols-4">
    {items.map(([label, value]) => <div key={label} className="min-w-0 border-t border-border py-3">
      <dt className="mb-1 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="m-0 text-lg font-semibold leading-snug tabular-nums">{value}</dd>
    </div>)}
  </dl>
}
