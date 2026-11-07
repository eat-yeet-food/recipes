import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { PageTitle } from '@eat-yeet/l5-ui-primitives/primitives/typography'
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <PageTitle>Page not found</PageTitle>
      <p className="mt-4">This content is unavailable.</p>
      <Link to="/" className="font-action font-bold underline decoration-1 underline-offset-4 hover:decoration-2">
        Return home
      </Link>
    </div>
  )
}
