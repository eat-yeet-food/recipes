/**
 * The dead ends a visitor can reach, styled as one thing.
 *
 * Three of them — a bad URL, a render that threw, and a chunk that would not
 * load — should all resolve to the same site chrome. TanStack's stock error
 * component renders an unstyled "Something went wrong! / Hide Error" panel
 * outside the site's type and color entirely.
 *
 * Every one of these now uses the site's display face and palette, says what
 * happened in a sentence, and offers a way out. A dead end with no exit is the
 * part that actually loses people.
 */
import { Link } from '@tanstack/react-router'

import { ArrowRight } from 'lucide-react'

/** The shared frame: heading, one line of explanation, and escape hatches. */
function DeadEnd({
  title,
  message,
  children,
}: {
  title: string
  message: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-[var(--max-width)] px-8 py-20 text-center max-sm:px-4">
      <h1 className="font-display text-4xl font-extrabold text-ink max-sm:text-3xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/65">{message}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">{children}</div>
    </div>
  )
}

/** The filled brand control, matching the hero's "Let's Eat". Its shadow is
    token-driven and lives on `[data-cta]` in site-overrides.css. */
const PRIMARY =
  'inline-flex items-center gap-2.5 rounded-full bg-brand-strong px-8 py-4 text-sm font-semibold uppercase tracking-[2px] text-white transition-all hover:-translate-y-0.5 hover:bg-ink'

/** The quiet text control, matching "View all categories". */
const SECONDARY =
  'inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[2px] text-brand-strong transition-colors hover:text-ink'

/** Rendered for any path the router cannot match. */
export function NotFound() {
  return (
    <DeadEnd
      title="Page Not Found"
      message="That page isn't here. It may have been renamed, or it may never have existed."
    >
      <Link to="/recipes" className={PRIMARY} data-cta>
        All Recipes
        <ArrowRight className="size-4" />
      </Link>
      <Link to="/browse" className={SECONDARY}>
        Browse by Category
      </Link>
    </DeadEnd>
  )
}

/**
 * A failed dynamic import means this browser is holding a build that no longer
 * exists — a cached chunk URL the deploy replaced. Reloading is the actual fix,
 * so say that rather than offering a generic retry, which re-runs the same
 * broken module graph and fails identically.
 */
function isStaleBuildError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(
    error.message,
  )
}

/** Rendered when a route throws. `reset` retries the route in place. */
export function ErrorState({ error, reset }: { error: Error; reset?: () => void }) {
  if (isStaleBuildError(error)) {
    return (
      <DeadEnd
        title="Reload to Continue"
        message="This page was updated while your browser was holding an older copy. A reload picks up the current version."
      >
        <button type="button" onClick={() => window.location.reload()} className={PRIMARY} data-cta>
          Reload the Page
          <ArrowRight className="size-4" />
        </button>
      </DeadEnd>
    )
  }

  return (
    <DeadEnd
      title="Something Broke"
      message="This page didn't load properly. Trying again often works; if it doesn't, the recipes are all still there."
    >
      {reset ? (
        <button type="button" onClick={reset} className={PRIMARY} data-cta>
          Try Again
          <ArrowRight className="size-4" />
        </button>
      ) : null}
      <Link to="/recipes" className={SECONDARY}>
        All Recipes
      </Link>
    </DeadEnd>
  )
}
