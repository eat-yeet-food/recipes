/**
 * The "Eat · Yeet" lockup — charcoal "Eat", a muted dot, and "Yeet" in the pink
 * gradient. The home hero owned this treatment first; the nav and the footer
 * now render the same component so the three cannot drift apart.
 *
 * Every class here is one `global.css` already carries — see CLAUDE.md §1.
 * That is also why there is no always-white variant: `bg-white/30` and the
 * unprefixed `[background:none]` are not in the compiled build, only their
 * `max-md:` forms are. A dark-at-every-width hero would need those added
 * first, and no route has one (`routeHasDarkHero` in layout.tsx is a stub).
 */

/** Per-surface type scale. Arbitrary sizes are limited to ones in global.css. */
const SIZES = {
  hero: {
    root: 'gap-3 text-[clamp(48px,6vw,80px)] max-md:gap-2 max-md:text-[clamp(40px,10vw,56px)]',
    dot: 'size-3',
  },
  nav: { root: 'gap-2 text-[22px]', dot: 'size-1' },
  footer: { root: 'gap-2.5 text-[28px]', dot: 'size-1.5' },
} as const

/* Gradient stops live in site-overrides.css so the lockup follows the brand
   tokens; `bg-clip-text` + `text-transparent` still come from the build. */
const GRADIENT = 'bg-clip-text text-transparent'

/**
 * Below `md` the home hero swaps its side-by-side layout for a full-bleed
 * photo, and the transparent nav sits on that photo too. Charcoal is
 * unreadable there, so both words go solid white — and the gradient needs
 * `-webkit-text-fill-color` unset as well as `color`, because `bg-clip-text`
 * paints through the fill, not the color.
 */
const ON_PHOTO = {
  eat: ' max-md:text-white',
  dot: ' max-md:bg-white/30',
  yeet: ' max-md:text-white max-md:[background:none] max-md:[-webkit-text-fill-color:white]',
}

export type WordmarkCopy = {
  first: string
  second: string
}

export function Wordmark({
  copy,
  size,
  onPhoto = false,
  className = '',
}: {
  copy: WordmarkCopy
  size: keyof typeof SIZES
  onPhoto?: boolean
  className?: string
}) {
  const { root, dot } = SIZES[size]
  const { first, second } = copy

  return (
    <span
      data-site-wordmark=""
      className={`flex items-center font-hero leading-none whitespace-nowrap ${root}${className ? ' ' + className : ''}`}
    >
      <span className={`text-ink ${onPhoto ? ON_PHOTO.eat : ''}`}>{first}</span>
      <span className={`shrink-0 rounded-full ${dot} bg-ink/20 ${onPhoto ? ON_PHOTO.dot : ''}`} />
      <span
        className={`${GRADIENT}${onPhoto ? ON_PHOTO.yeet : ''}`}
        data-wordmark-gradient=""
        data-on-photo={onPhoto ? '' : undefined}
      >
        {second}
      </span>
    </span>
  )
}
