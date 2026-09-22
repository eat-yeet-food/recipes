'use client'
import { useEffect, useId, useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { Textarea } from '@eat-yeet/l5-ui-primitives/primitives/textarea'

export type RatingReply = { id: string; name: string; body: string; own: boolean }
export type RatingReview = {
  id: string
  name: string
  score: number
  reviewText: string
  own: boolean
  replies: RatingReply[]
}
export type RatingSummary = {
  average: number | null
  count: number
  eatPercentage: number | null
  starDistribution: number[]
  ownRating: number | null
  ownReview: string
  reviews: RatingReview[]
}
export type RatingIdentity = { name: string; email: string }
export type RatingClient = {
  read: () => Promise<RatingSummary>
  save: (input: RatingIdentity & { score: number; reviewText: string }) => Promise<RatingSummary>
  reply: (input: RatingIdentity & { reviewId: string; body: string }) => Promise<RatingSummary>
}

const identityStorageKey = 'eatyeet:reviewer'
function RatingStar({ filled, className }: { filled: boolean; className?: string }) {
  return <Star
    aria-hidden="true"
    strokeWidth={1.5}
    className={cn(
      'size-6',
      filled ? 'fill-brand-alt text-brand-alt' : 'fill-transparent text-muted-foreground',
      className,
    )}
  />
}

function RatingDisplay({ value }: { value: number }) {
  return <span role="img" aria-label={`${value.toFixed(1)} out of 5 stars`} className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => <RatingStar key={star} filled={star <= Math.round(value)} className="size-4.5" />)}
  </span>
}

function IdentityFields({ prefix, identity, onChange, disabled = false }: {
  prefix: string
  identity: RatingIdentity
  onChange: (identity: RatingIdentity) => void
  disabled?: boolean
}) {
  return <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
    <div>
      <label htmlFor={`${prefix}-name`} className="mb-2 block text-sm font-medium text-muted-foreground">Name</label>
      <Input
        id={`${prefix}-name`}
        name="name"
        autoComplete="name"
        value={identity.name}
        onChange={(event) => onChange({ ...identity, name: event.target.value })}
        placeholder="Your name"
        maxLength={80}
        required
        disabled={disabled}
      />
    </div>
    <div>
      <label htmlFor={`${prefix}-email`} className="mb-2 block text-sm font-medium text-muted-foreground">Email</label>
      <Input
        id={`${prefix}-email`}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={identity.email}
        onChange={(event) => onChange({ ...identity, email: event.target.value })}
        placeholder="you@example.com"
        maxLength={320}
        required
        disabled={disabled}
      />
    </div>
  </div>
}

function ReviewSummary({ summary, identity, onIdentityChange, onReply }: {
  summary: RatingSummary
  identity: RatingIdentity
  onIdentityChange: (identity: RatingIdentity) => void
  onReply: (reviewId: string, body: string) => Promise<void>
}) {
  const id = useId()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  if (!summary.count) return <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>

  async function submitReply(reviewId: string) {
    if (!body.trim() || !identity.name.trim() || !identity.email.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await onReply(reviewId, body)
      setBody('')
      setReplyingTo(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your reply could not be posted. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <strong className="text-2xl font-bold">{summary.average!.toFixed(1)}</strong>
        <RatingDisplay value={summary.average!} />
      </div>
      <span className="rounded-control bg-brand px-3 py-1 font-action text-xs font-bold text-ink">
        {summary.eatPercentage! >= 50 ? `${summary.eatPercentage}% EAT` : `${100 - summary.eatPercentage!}% YEET`}
      </span>
      <span className="text-sm text-muted-foreground">{summary.count} {summary.count === 1 ? 'rating' : 'ratings'}</span>
    </div>

    <div className="space-y-5">
      {summary.reviews.map((review) => <article key={review.id} className="flex gap-4 border-b border-border pb-5 last:border-0">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-soft font-action text-sm font-bold text-ink">
          {(review.name[0] || 'C').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <strong className="font-action text-sm">{review.name}</strong>
            <span className="rounded-control bg-brand-soft px-2.5 py-0.5 font-action text-xs font-bold text-ink">{review.score >= 4 ? 'EAT' : 'YEET'}</span>
          </div>
          <div className="mb-2"><RatingDisplay value={review.score} /></div>
          <p className="text-sm leading-relaxed text-ink">{review.reviewText}</p>

          {review.replies.length ? <div className="mt-4 space-y-4 border-l-2 border-brand pl-4">
            {review.replies.map((reply) => <div key={reply.id} className="flex gap-3">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-control bg-brand-soft font-action text-xs font-bold text-ink">
                {(reply.name[0] || 'C').toUpperCase()}
              </span>
              <div>
                <strong className="font-action text-xs">{reply.name}</strong>
                <p className="mt-1 text-sm leading-relaxed text-ink">{reply.body}</p>
              </div>
            </div>)}
          </div> : null}

          <Button
            variant="link"
            className="mt-3"
            aria-expanded={replyingTo === review.id}
            onClick={() => {
              setReplyingTo(replyingTo === review.id ? null : review.id)
              setBody('')
              setError('')
            }}
          >
            {replyingTo === review.id ? 'Cancel reply' : review.replies.length ? 'Reply again' : 'Reply'}
          </Button>

          {replyingTo === review.id ? <form
            className="mt-4 flex flex-col gap-4 rounded-lg bg-brand-soft p-4"
            onSubmit={(event) => { event.preventDefault(); void submitReply(review.id) }}
          >
            <IdentityFields prefix={`${id}-reply-${review.id}`} identity={identity} onChange={onIdentityChange} disabled={saving} />
            <div>
              <label htmlFor={`${id}-reply-body-${review.id}`} className="mb-2 block text-sm font-medium text-muted-foreground">Reply</label>
              <Textarea
                id={`${id}-reply-body-${review.id}`}
                value={body}
                onChange={(event) => { setBody(event.target.value); setError('') }}
                placeholder={`Reply to ${review.name}...`}
                maxLength={1000}
                rows={3}
                required
                disabled={saving}
                className="min-h-24 resize-y"
              />
            </div>
            {error ? <div role="alert" className="text-sm text-danger">{error}</div> : null}
            <Button variant="on-ink" className="self-start" type="submit" disabled={saving || !body.trim() || !identity.name.trim() || !identity.email.trim()}>
              {saving ? 'Posting...' : 'Post Reply'}
            </Button>
          </form> : null}
        </div>
      </article>)}
    </div>
  </div>
}

/** Yeet's rating and review module with an anonymous transport supplied by the page. */
export function RecipeRating({ title: _title, client }: { title: string; client: RatingClient }) {
  const id = useId()
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [identity, setIdentity] = useState<RatingIdentity>({ name: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function applySummary(value: RatingSummary) {
    setSummary(value)
    setScore(value.ownRating)
    setReviewText(value.ownReview)
  }

  function persistIdentity() {
    try { localStorage.setItem(identityStorageKey, JSON.stringify({ name: identity.name.trim(), email: identity.email.trim() })) }
    catch {}
  }

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(identityStorageKey) ?? 'null')
      if (stored && typeof stored.name === 'string' && typeof stored.email === 'string')
        setIdentity({ name: stored.name, email: stored.email })
    } catch {}
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    client.read().then((value) => { if (active) { applySummary(value); setError('') } })
      .catch(() => { if (active) setError('Ratings are unavailable. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [client])

  async function refresh() {
    setLoading(true)
    setError('')
    try { applySummary(await client.read()) }
    catch { setError('Ratings are unavailable. Please try again.') }
    finally { setLoading(false) }
  }

  async function submit() {
    if (!score || !identity.name.trim() || !identity.email.trim() || saving || loading) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const value = await client.save({ score, reviewText, name: identity.name, email: identity.email })
      applySummary(value)
      persistIdentity()
      setMessage(`Your ${score}-star rating${reviewText.trim() ? ' and review are' : ' is'} saved.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your rating could not be saved. Please try again.') }
    finally { setSaving(false) }
  }

  async function submitReply(reviewId: string, body: string) {
    const value = await client.reply({ reviewId, body, name: identity.name, email: identity.email })
    applySummary(value)
    persistIdentity()
  }

  return <section aria-label="Ratings & Reviews" className="text-ink print:hidden">
    <h2 className="mb-6 flex items-center gap-4 font-display text-[28px] font-extrabold leading-tight text-ink">
      Ratings &amp; Reviews
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </h2>

    <div className="mb-8 rounded-lg border border-ink/10 bg-card p-6 shadow-md">
      <h3 className="mb-5 text-lg font-semibold text-ink">{summary?.ownRating ? 'Update your rating' : 'Rate this recipe'}</h3>
      <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="flex flex-col gap-5">
        <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-2 text-sm font-medium text-muted-foreground">Star rating</legend>
          <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
            {[1, 2, 3, 4, 5].map((star) => <label key={star} className="relative inline-flex size-7 cursor-pointer items-center justify-center max-[640px]:size-11" onMouseEnter={() => setHover(star)}>
              <input className="peer sr-only" type="radio" name={id} value={star} checked={score === star} onChange={() => { setScore(star); setHover(null); setError(''); setMessage('') }} />
              <span className="sr-only">{star} {star === 1 ? 'star' : 'stars'}</span>
              <span className="flex size-7 items-center justify-center rounded-control transition-transform hover:scale-110 peer-focus-visible:outline-2 peer-focus-visible:outline-ink peer-focus-visible:outline-offset-0 peer-disabled:opacity-50 max-[640px]:size-11">
                <RatingStar filled={star <= (hover ?? score ?? 0)} />
              </span>
            </label>)}
          </div>
        </fieldset>

        <IdentityFields prefix={`${id}-rating`} identity={identity} onChange={(value) => { setIdentity(value); setError(''); setMessage('') }} disabled={saving} />

        <div>
          <label htmlFor={`${id}-review`} className="mb-2 block text-sm font-medium text-muted-foreground">Review (optional)</label>
          <Textarea
            id={`${id}-review`}
            value={reviewText}
            onChange={(event) => { setReviewText(event.target.value); setError(''); setMessage('') }}
            placeholder="Share your experience..."
            maxLength={2000}
            rows={4}
            disabled={saving}
            className="min-h-32 resize-y"
          />
        </div>

        {error ? <div role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          {!summary && <Button variant="link" onClick={() => void refresh()} disabled={loading}>Try again</Button>}
        </div> : null}
        <Button variant="on-ink" className="w-full disabled:bg-brand disabled:text-ink disabled:opacity-50" type="submit"
          disabled={!score || !summary || loading || saving || !identity.name.trim() || !identity.email.trim()}>
          {saving ? 'Submitting...' : summary?.ownRating ? 'Update Rating' : 'Submit Rating'}
        </Button>
        {message ? <div className="text-sm text-muted-foreground" role="status">{message}</div> : null}
      </form>
    </div>

    {summary ? <ReviewSummary summary={summary} identity={identity} onIdentityChange={setIdentity} onReply={submitReply} /> : null}
  </section>
}
