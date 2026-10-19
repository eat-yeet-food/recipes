'use client'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, Clock, Plus, UtensilsCrossed } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Link } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { ResponsiveImage } from '@eat-yeet/l5-ui-primitives/primitives/responsive-image'
import { SignInLink } from '@eat-yeet/l6-ui-shell/account/account-nav'
import { useAccount } from '@eat-yeet/l6-ui-shell/account/account'
import { kitchenErrorMessage, type KitchenClient, type KitchenFormulaSummary, type KitchenList } from './kitchen-client'
import { decodeKitchenState, kitchenPath, type KitchenRecipe } from './kitchen-plugin'
import { KitchenBand, KitchenNotice, kitchenPageClass, timeAgo, type KitchenNoticeValue } from './kitchen-ui'

const cardClass = 'group flex flex-col overflow-hidden rounded-surface bg-white text-ink no-underline transition-card-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink'
const imageSizes = '(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc((100vw - 72px) / 2), 368px'

function CardImage({ kitchen }: { kitchen: KitchenRecipe }) {
  const src = imageUrl(kitchen.recipe)
  return <div className="relative aspect-[16/10] w-full overflow-hidden bg-tint">
    {src
      ? <ResponsiveImage src={src} alt="" width="800" height="500" sizes={imageSizes} className="absolute inset-0 h-full w-full object-cover transition-image-zoom group-hover:scale-[1.06]" />
      : <UtensilsCrossed aria-hidden="true" className="absolute inset-0 m-auto size-10 text-ink/15" strokeWidth="1.25" />}
  </div>
}

function FormulaCard({ kitchen, formula }: { kitchen: KitchenRecipe; formula: KitchenFormulaSummary }) {
  const state = decodeKitchenState(kitchen, formula.state)
  return <Link to={kitchenPath(formula.recipeSlug, formula.id, true)} className={cardClass} data-kitchen-formula={formula.id}>
    <CardImage kitchen={kitchen} />
    <div className="flex flex-1 flex-col gap-2 px-5 pt-5 pb-1.5">
      <h3 className="break-words font-display text-[21px] leading-tight font-bold">{formula.name}</h3>
      <p className="text-sm text-muted-foreground">From {kitchen.recipe.title}</p>
      <p className="flex-1 text-sm leading-normal">{state ? kitchen.plugin.facts(kitchen.recipe, kitchen.config, state) : 'Open to update this formula for the current recipe.'}</p>
      <p className="mt-2 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
        <Clock aria-hidden="true" className="size-3.5 opacity-60" />Edited {timeAgo(formula.updatedAt)}
      </p>
    </div>
  </Link>
}

function StartCards({ recipes, headingId }: { recipes: KitchenRecipe[]; headingId: string }) {
  return <ul aria-labelledby={headingId} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {recipes.map((kitchen) => <li key={kitchen.recipe.slug} className="contents">
      <Link to={kitchenPath(kitchen.recipe.slug)} className={cn(cardClass, 'bg-muted')} data-kitchen-start={kitchen.recipe.slug}>
        <CardImage kitchen={kitchen} />
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="font-display text-[21px] leading-tight font-bold">{kitchen.recipe.title}</h3>
          <p className="flex-1 text-sm leading-normal text-muted-foreground">{kitchen.plugin.facts(kitchen.recipe, kitchen.config, kitchen.defaultState)}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 font-action text-sm font-bold underline decoration-1 underline-offset-4 group-hover:decoration-2">Start from this recipe<ArrowRight aria-hidden="true" className="size-4" /></span>
        </div>
      </Link>
    </li>)}
  </ul>
}

function GroupHeading({ id, title, count }: { id: string; title: string; count?: number }) {
  return <h2 id={id} className="flex items-center gap-4 font-display text-[28px] leading-tight font-bold after:h-px after:flex-1 after:bg-border">
    {title}{count !== undefined && <span className="font-body text-[15px] font-normal text-muted-foreground">{count}</span>}
  </h2>
}

export function KitchenLibraryPage({ recipes, client, deletedId }: { recipes: KitchenRecipe[]; client: KitchenClient; deletedId?: string }) {
  const { status } = useAccount()
  const [list, setList] = useState<KitchenList | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<KitchenNoticeValue | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const startId = useId()
  const deletedPanel = useId()
  const bySlug = useMemo(() => new Map(recipes.map((kitchen) => [kitchen.recipe.slug, kitchen])), [recipes])

  const load = useCallback(async () => {
    setError('')
    try {
      const next = await client.list()
      setList(next)
      return next
    } catch (reason) {
      setError(kitchenErrorMessage(reason, 'Your formulas could not be loaded.'))
      return null
    }
  }, [client])

  const restore = useCallback(async (formula: KitchenFormulaSummary) => {
    setRestoring(formula.id)
    try {
      const restored = await client.undelete(formula.id)
      await load()
      setNotice({ message: restored.name === formula.name ? `Restored ${restored.name}.` : `Restored as ${restored.name}, since the name is in use.` })
    } catch (reason) {
      setNotice({ tone: 'error', message: kitchenErrorMessage(reason, 'The formula could not be restored. Please try again.') })
    } finally { setRestoring(null) }
  }, [client, load])

  useEffect(() => {
    if (status !== 'signed-in') return
    void load().then((next) => {
      const deleted = deletedId ? next?.deleted.find((formula) => formula.id === deletedId) : undefined
      if (!deleted) return
      window.history.replaceState(window.history.state, '', '/kitchen')
      setNotice({ message: `Deleted ${deleted.name}. It stays in Recently deleted for 30 days.`, action: { label: 'Undo', run: () => { void restore(deleted) } } })
    })
  }, [status, load, deletedId, restore])

  const groups = useMemo(() => {
    const result = new Map<string, { label: string; items: { kitchen: KitchenRecipe; formula: KitchenFormulaSummary }[] }>()
    for (const formula of list?.formulas ?? []) {
      const kitchen = bySlug.get(formula.recipeSlug)
      if (!kitchen) continue
      const group = result.get(kitchen.plugin.id) ?? { label: kitchen.plugin.label, items: [] }
      group.items.push({ kitchen, formula })
      result.set(kitchen.plugin.id, group)
    }
    return [...result.entries()]
  }, [list, bySlug])
  const deleted = (list?.deleted ?? []).filter((formula) => bySlug.has(formula.recipeSlug))
  const signedIn = status === 'signed-in'
  const count = list?.formulas.filter((formula) => bySlug.has(formula.recipeSlug)).length

  return <>
    <KitchenBand
      eyebrow={signedIn && count !== undefined ? `Your formulas · ${count}` : 'Your own versions'}
      title="Test Kitchen"
      actions={signedIn ? <Button asChild><a href={`#${startId}`}><Plus className="size-4" />New formula</a></Button> : undefined}
    >
      <p>Your own versions of the dough recipes. Recipes stay as written; everything you change lives here{signedIn ? ' and saves as you go.' : '.'}</p>
    </KitchenBand>
    <div className={cn(kitchenPageClass, 'grid gap-12 py-11 max-[640px]:py-8')}>
      {status === 'signed-out' && <p className="max-w-[640px] text-base leading-relaxed">
        Try any change below without an account; your work stays in this browser. <SignInLink className="font-action font-bold underline decoration-1 underline-offset-4 hover:decoration-2">Sign in</SignInLink> to save named formulas with full history on every device.
      </p>}
      {signedIn && !list && !error && <p role="status" className="text-muted-foreground">Loading your formulas…</p>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-4 rounded-field bg-danger-soft p-4 text-sm text-danger">
        <span>{error}</span><Button variant="link" className="text-danger" onClick={() => void load()}>Try again</Button>
      </div>}
      {signedIn && list && count === 0 && <p className="text-base leading-relaxed">No formulas yet. Start from a recipe below, change anything, then save it here.</p>}
      {groups.map(([id, group]) => <section key={id} aria-labelledby={`group-${id}`} className="grid gap-6">
        <GroupHeading id={`group-${id}`} title={group.label} count={group.items.length} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {group.items.map(({ kitchen, formula }) => <li key={formula.id} className="contents"><FormulaCard kitchen={kitchen} formula={formula} /></li>)}
        </ul>
      </section>)}
      <section id={startId} aria-labelledby={`${startId}-heading`} className="grid scroll-mt-24 gap-6">
        <GroupHeading id={`${startId}-heading`} title="Start from a recipe" />
        <p className="-mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">Copies the recipe’s formula into a page you can change freely. The recipe itself never changes.</p>
        <StartCards recipes={recipes} headingId={`${startId}-heading`} />
      </section>
      {deleted.length > 0 && <section aria-label="Recently deleted" className="grid gap-4 border-t border-border pt-6">
        <Button variant="link" className="justify-self-start gap-1.5" aria-expanded={deletedOpen} aria-controls={deletedPanel} onClick={() => setDeletedOpen((open) => !open)}>
          Recently deleted ({deleted.length}){deletedOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
        </Button>
        <ul id={deletedPanel} hidden={!deletedOpen} className="grid">
          {deleted.map((formula) => <li key={formula.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
            <div className="min-w-0"><p className="break-words font-action font-bold">{formula.name}</p><p className="text-sm text-muted-foreground">From {bySlug.get(formula.recipeSlug)!.recipe.title} · deleted {timeAgo(formula.deletedAt!)}</p></div>
            <Button variant="utility" size="sm" disabled={restoring !== null} onClick={() => void restore(formula)}>{restoring === formula.id ? 'Restoring…' : 'Restore'}</Button>
          </li>)}
        </ul>
      </section>}
    </div>
    <KitchenNotice notice={notice} onDismiss={() => setNotice(null)} />
  </>
}
