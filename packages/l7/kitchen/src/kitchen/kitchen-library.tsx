'use client'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ArrowRight, Clock, Plus } from 'lucide-react'
import { cn } from '@eat-yeet/l0-foundation/utils'
import { imageUrl } from '@eat-yeet/l1-recipe-model/recipes'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { Callout } from '@eat-yeet/l5-ui-primitives/primitives/callout'
import { Disclosure } from '@eat-yeet/l5-ui-primitives/primitives/disclosure'
import { SectionTitle } from '@eat-yeet/l5-ui-primitives/primitives/typography'
import { CatalogCard } from '@eat-yeet/l6-ui-catalog/cards'
import { SignInLink } from '@eat-yeet/l6-ui-shell/account/account-nav'
import { useNotebookClient } from './kitchen-local'
import { kitchenErrorMessage, type KitchenClient, type KitchenFormulaSummary, type KitchenList } from './kitchen-client'
import { decodeKitchenState, kitchenPath, type KitchenRecipe } from './kitchen-plugin'
import { KitchenBand, KitchenNotice, kitchenPageClass, timeAgo, type KitchenNoticeValue } from './kitchen-ui'

function FormulaCard({ kitchen, formula }: { kitchen: KitchenRecipe; formula: KitchenFormulaSummary }) {
  const state = decodeKitchenState(kitchen, formula.state)
  return <CatalogCard to={kitchenPath(formula.recipeSlug, formula.id, true)} image={imageUrl(kitchen.recipe)} title={formula.name} data-kitchen-formula={formula.id}
    meta={<span className="flex items-center gap-1.5"><Clock aria-hidden="true" className="size-3.5" />Edited {timeAgo(formula.updatedAt)}</span>}>
    <p className="text-sm text-muted-foreground">From {kitchen.recipe.title}</p>
    <p className="mt-2 text-sm leading-normal">{state ? kitchen.plugin.facts(kitchen.recipe, kitchen.config, state) : 'Open to update this formula for the current recipe.'}</p>
  </CatalogCard>
}

function StartCards({ recipes, headingId }: { recipes: KitchenRecipe[]; headingId: string }) {
  return <ul aria-labelledby={headingId} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {recipes.map((kitchen) => <li key={kitchen.recipe.slug} className="contents">
      <CatalogCard to={kitchenPath(kitchen.recipe.slug)} image={imageUrl(kitchen.recipe)} title={kitchen.recipe.title} data-kitchen-start={kitchen.recipe.slug}
        description={kitchen.plugin.facts(kitchen.recipe, kitchen.config, kitchen.defaultState)}>
        <span className="mt-3 inline-flex items-center gap-1.5 font-action text-sm font-bold underline decoration-1 underline-offset-4 group-hover:decoration-2">Start from this recipe<ArrowRight aria-hidden="true" className="size-4" /></span>
      </CatalogCard>
    </li>)}
  </ul>
}

/**
 * A fixed-height Recently deleted row: name and meta on one line each, text
 * actions below. Delete swaps the row to an inline confirm, since it is permanent.
 */
function DeletedRow({ formula, recipeTitle, busy, confirming, onConfirm, onRestore, onPurge }: {
  formula: KitchenFormulaSummary; recipeTitle: string; busy: string | null; confirming: boolean
  onConfirm: (open: boolean) => void; onRestore: () => void; onPurge: () => void
}) {
  const working = busy === formula.id
  const action = 'min-h-11 text-body-sm'
  return <li data-deleted-formula={formula.id} data-confirming={confirming || undefined}
    className={cn('grid h-[104px] content-center gap-0.5 border-b border-border px-3 last:border-b-0', confirming && 'bg-brand-soft/50')}>
    <p className="truncate font-action font-bold">{confirming ? `Delete ${formula.name}?` : formula.name}</p>
    <p className="truncate text-sm text-muted-foreground">{confirming ? 'This can’t be undone.' : `${recipeTitle} · ${timeAgo(formula.deletedAt!)}`}</p>
    <div className="-mb-2 flex items-center gap-6">
      {confirming
        ? <>
          <Button variant="link" className={action} disabled={working} onClick={() => onConfirm(false)}>Cancel</Button>
          <Button variant="link" className={cn(action, 'text-danger')} disabled={busy !== null} onClick={onPurge}>{working ? 'Deleting…' : 'Delete'}</Button>
        </>
        : <>
          <Button variant="link" className={action} disabled={busy !== null} onClick={onRestore}>{working ? 'Restoring…' : 'Restore'}</Button>
          <Button variant="link" className={cn(action, 'text-danger')} disabled={busy !== null} onClick={() => onConfirm(true)}>Delete</Button>
        </>}
    </div>
  </li>
}

function GroupHeading({ id, title, count }: { id: string; title: string; count?: number }) {
  return <SectionTitle id={id} size="title" rule="trailing">
    {title}{count !== undefined && <span className="font-body text-body-sm font-normal text-muted-foreground">{count}</span>}
  </SectionTitle>
}

export function KitchenLibraryPage({ recipes, client: remote, deletedId }: { recipes: KitchenRecipe[]; client: KitchenClient; deletedId?: string }) {
  const notebook = useNotebookClient(remote)
  const client = notebook.client
  const [list, setList] = useState<KitchenList | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<KitchenNoticeValue | null>(null)
  const [deletedOpen, setDeletedOpen] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const startId = useId()
  const bySlug = useMemo(() => new Map(recipes.map((kitchen) => [kitchen.recipe.slug, kitchen])), [recipes])

  const load = useCallback(async () => {
    if (!client) return null
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
    if (!client) return
    setRestoring(formula.id)
    try {
      const restored = await client.undelete(formula.id)
      await load()
      setNotice({ message: restored.name === formula.name ? `Restored ${restored.name}.` : `Restored as ${restored.name}, since the name is in use.` })
    } catch (reason) {
      setNotice({ tone: 'error', message: kitchenErrorMessage(reason, 'The formula could not be restored. Please try again.') })
    } finally { setRestoring(null) }
  }, [client, load])

  const purge = useCallback(async (formula: KitchenFormulaSummary) => {
    if (!client) return
    setRestoring(formula.id)
    try {
      await client.purge(formula.id)
      setConfirming(null)
      await load()
      setNotice({ message: `Deleted ${formula.name}.` })
    } catch (reason) {
      setNotice({ tone: 'error', message: kitchenErrorMessage(reason, 'The formula could not be deleted. Please try again.') })
    } finally { setRestoring(null) }
  }, [client, load])

  useEffect(() => {
    if (!client) return
    setList(null)
    void load().then((next) => {
      if (notebook.moved) setNotice({ message: notebook.moved === 1 ? 'Moved 1 formula from this browser to your account.' : `Moved ${notebook.moved} formulas from this browser to your account.` })
      const deleted = deletedId ? next?.deleted.find((formula) => formula.id === deletedId) : undefined
      if (!deleted) return
      window.history.replaceState(window.history.state, '', '/notebook')
      setNotice({ message: `Deleted ${deleted.name}. It stays in Recently deleted for 30 days.`, action: { label: 'Undo', run: () => { void restore(deleted) } } })
    })
  }, [client, load, deletedId, restore, notebook.moved])

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
  const ready = client !== null
  const local = notebook.local
  const count = list?.formulas.filter((formula) => bySlug.has(formula.recipeSlug)).length

  return <>
    <KitchenBand
      title="Notebook"
      actions={ready ? <>{local && <SignInLink className="font-action font-bold underline decoration-1 underline-offset-4 hover:decoration-2">Sign in</SignInLink>}<Button asChild><a href={`#${startId}`}><Plus className="size-4" />New formula</a></Button></> : undefined}
    >
      <p>Your versions of the dough recipes. Saves as you go.</p>
    </KitchenBand>
    <div className={cn(kitchenPageClass, 'grid gap-12 py-11 max-[640px]:py-8')}>
      {ready && !list && !error && <p role="status" className="text-muted-foreground">Loading your formulas…</p>}
      {error && <Callout tone="danger" className="flex flex-wrap items-center gap-4">
        <span>{error}</span><Button variant="link" className="text-danger" onClick={() => void load()}>Try again</Button>
      </Callout>}
      {ready && list && count === 0 && <p className="text-base leading-relaxed">No formulas yet. Start from a recipe below, change anything, then save it here.</p>}
      {groups.map(([id, group]) => <section key={id} aria-labelledby={`group-${id}`} className="grid gap-6">
        <GroupHeading id={`group-${id}`} title={group.label} count={group.items.length} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {group.items.map(({ kitchen, formula }) => <li key={formula.id} className="contents"><FormulaCard kitchen={kitchen} formula={formula} /></li>)}
        </ul>
      </section>)}
      <section id={startId} aria-labelledby={`${startId}-heading`} className="grid scroll-mt-24 gap-6">
        <GroupHeading id={`${startId}-heading`} title="Start from a recipe" />
        <StartCards recipes={recipes} headingId={`${startId}-heading`} />
      </section>
      {deleted.length > 0 && <section aria-label="Recently deleted" className="grid gap-4 border-t border-border pt-6">
        <Disclosure label={`Recently deleted (${deleted.length})`} open={deletedOpen} onOpenChange={setDeletedOpen} triggerClassName="w-auto justify-start">
        <ul className="grid">
          {deleted.map((formula) => <DeletedRow key={formula.id} formula={formula} recipeTitle={bySlug.get(formula.recipeSlug)!.recipe.title}
            busy={restoring} confirming={confirming === formula.id} onConfirm={(open) => setConfirming(open ? formula.id : null)}
            onRestore={() => void restore(formula)} onPurge={() => void purge(formula)} />)}
        </ul>
        </Disclosure>
      </section>}
    </div>
    <KitchenNotice notice={notice} onDismiss={() => setNotice(null)} />
  </>
}
