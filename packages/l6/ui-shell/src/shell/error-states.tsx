'use client'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { PageTitle } from '@eat-yeet/l5-ui-primitives/primitives/typography'
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
import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'

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
      <PageTitle>{title}</PageTitle>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">{children}</div>
    </div>
  )
}


/** Rendered for any path the router cannot match. */
export function NotFound() {
  return (
    <DeadEnd
      title="Page Not Found"
      message="That page isn't here. It may have been renamed, or it may never have existed."
    >
      <Button asChild size="lg" data-cta=""><Link to="/recipes">
        All Recipes
        <ArrowRight className="size-4" />
      </Link></Button>
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
        <Button size="lg" onClick={() => window.location.reload()} data-cta="">
          Reload the Page
          <ArrowRight className="size-4" />
        </Button>
      </DeadEnd>
    )
  }

  return (
    <DeadEnd
      title="Something Broke"
      message="This page didn't load properly. Trying again often works; if it doesn't, the recipes are all still there."
    >
      {reset ? (
        <Button size="lg" onClick={reset} data-cta="">
          Try Again
          <ArrowRight className="size-4" />
        </Button>
      ) : null}
      <Button asChild variant="link"><Link to="/recipes">
        All Recipes
      </Link></Button>
    </DeadEnd>
  )
}
