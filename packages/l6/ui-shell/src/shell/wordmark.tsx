/** One lockup for navigation, home, footer, and handbook. */
const SIZES = {
  hero: { root: 'gap-3 text-[clamp(38px,6vw,80px)] max-md:gap-2', icon: 'size-14 md:size-20', dot: 'size-2' },
  nav: { root: 'gap-2 text-[22px]', icon: 'size-8', dot: 'size-1' },
  footer: { root: 'gap-2 text-[28px]', icon: 'size-9', dot: 'size-1.5' },
} as const
export type WordmarkCopy = { first: string; second: string }
export function Wordmark({ copy, size, onPhoto = false, className = '' }: { copy: WordmarkCopy; size: keyof typeof SIZES; onPhoto?: boolean; className?: string }) {
  const style = SIZES[size]
  return <span data-site-wordmark="" data-wordmark-size={size} className={`inline-flex items-center font-hero leading-none whitespace-nowrap ${style.root} ${className}`}>
    {size === 'hero' && <img src="/donut-icon.svg" alt="" className={`${style.icon} shrink-0`} width="48" height="48" />}
    <span className={onPhoto ? 'text-white' : 'text-ink'}>{copy.first}</span>
    <span aria-hidden="true" className={`shrink-0 rounded-full ${style.dot} ${onPhoto ? 'bg-white' : 'bg-muted-foreground'}`} />
    <span className="-rotate-3 rounded-[40%_35%_40%_25%] bg-brand px-2 py-2 text-ink">{copy.second}</span>
  </span>
}
