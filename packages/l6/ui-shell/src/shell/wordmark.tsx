'use client'
/** One lockup for navigation, home, footer, and handbook. The second word is pink → orange lettering on a tilted plum sticker with an orange peel. */
const SIZES = {
  hero: { root: 'gap-3 text-wordmark max-md:gap-2', icon: 'size-14 md:size-20', dot: 'size-2' },
  nav: { root: 'gap-2 text-title-sm', icon: 'size-8', dot: 'size-1' },
  footer: { root: 'gap-2 text-title', icon: 'size-9', dot: 'size-1.5' },
} as const
export type WordmarkCopy = { first: string; second: string }
export function Wordmark({ copy, size, onPhoto = false, className = '' }: { copy: WordmarkCopy; size: keyof typeof SIZES; onPhoto?: boolean; className?: string }) {
  const style = SIZES[size]
  return <span data-site-wordmark="" data-wordmark-size={size} className={`inline-flex items-center font-hero leading-none whitespace-nowrap ${style.root} ${className}`}>
    {size === 'hero' && <img src="/donut-icon.svg" alt="" className={`${style.icon} shrink-0`} width="48" height="48" />}
    <span className={onPhoto ? 'text-white' : 'text-ink'}>{copy.first}</span>
    <span aria-hidden="true" className={`shrink-0 rounded-full ${style.dot} ${onPhoto ? 'bg-white' : 'bg-muted-foreground'}`} />
    <span className="group/sticker -rotate-4 rounded-[40%_35%_40%_25%] bg-ink px-2 py-2 shadow-peel"><span className="text-gradient-accent group-hover/sticker:animate-wordmark-shimmer group-active/sticker:animate-wordmark-shimmer">{copy.second}</span></span>
  </span>
}
