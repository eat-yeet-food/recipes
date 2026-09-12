import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="mt-4">This content is unavailable.</p>
      <Link to="/" className="underline">
        Return home
      </Link>
    </div>
  )
}
