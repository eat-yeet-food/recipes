/** Passive recipe facts: one bright surface, clear labels, prominent values. */
export function RecipeFacts({ items }: { items: readonly (readonly [string, string])[] }) {
  return <dl className="my-7 grid grid-cols-2 gap-x-6 gap-y-5 rounded-field bg-brand p-5 text-ink max-[360px]:grid-cols-1">
    {items.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="mb-2 text-xs font-semibold">{label}</dt>
      <dd className="m-0 text-xl font-extrabold leading-tight tabular-nums">{value}</dd>
    </div>)}
  </dl>
}
