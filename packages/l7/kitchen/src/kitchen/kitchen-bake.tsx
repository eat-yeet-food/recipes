'use client'
import { useEffect, useState } from 'react'
import { TodayBatch, useTodayCount } from './today-batch'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { RecipeArticle, type RecipeArticleHeading } from '@eat-yeet/l7-recipes/recipes/recipe-article'
import type { RecipePageBlockContext } from '@eat-yeet/l7-recipes/recipes/recipe-blocks'
import { kitchenErrorCode, kitchenErrorMessage, type KitchenClient, type KitchenFormula } from './kitchen-client'
import { KitchenGate, KitchenMessage } from './kitchen-gate'
import { decodeKitchenState, kitchenPath, type KitchenRecipe } from './kitchen-plugin'
import { readScratch, readScratchName } from './kitchen-scratch'
import { KitchenNotice, type KitchenNoticeValue } from './kitchen-ui'

type BakeSheetProps = {
  kitchen: KitchenRecipe
  siteUrl: string
  blockRegistry: PageBlockRegistry<RecipePageBlockContext>
  /** `?count=` from the URL: today's batch, which never edits the formula. */
  initialCount?: number
}

/** The recipe rewritten with a formula's numbers, ready to cook from or print. */
export function KitchenBakeSheet({ kitchen, state, name, heading, siteUrl, blockRegistry, initialCount }: BakeSheetProps & { state: unknown; name: string; heading: RecipeArticleHeading }) {
  const { plugin, recipe, config } = kitchen
  const usual = plugin.batchCount(state)
  const [count, setCount] = useTodayCount(usual, initialCount)
  const page = plugin.resolveRecipe(recipe, config, plugin.withBatchCount(state, count))
  const noun = plugin.batchNoun(state, count)
  return <div data-kitchen-bake="">
    <RecipeArticle
      page={page}
      siteUrl={siteUrl}
      blockRegistry={blockRegistry}
      heading={heading}
      beforeIngredients={<TodayBatch count={count} noun={noun} plural={plugin.batchNoun(state, 2)} onChange={setCount}
        note={`The usual batch for ${name} is ${usual}.`} />}
    />
  </div>
}

const byline = (kitchen: KitchenRecipe) => `Bake sheet · ${kitchen.recipe.title}`

export function KitchenScratchBakePage(props: BakeSheetProps) {
  const { kitchen } = props
  const [state, setState] = useState<unknown | null>(null)
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    setState(readScratch(kitchen) ?? kitchen.defaultState)
    setName(readScratchName(kitchen.recipe.slug))
  }, [kitchen])
  if (state === null) return <KitchenMessage title="Opening the bake sheet…" busy>Loading your numbers from this browser.</KitchenMessage>
  const title = name ?? kitchen.recipe.title
  return <KitchenBakeSheet {...props} state={state} name="This remix" heading={{
    crumbs: [{ label: 'Remix', href: '/remix' }, { label: title }],
    title,
    byline: 'Bake sheet · unsaved remix from this browser',
    edit: { href: kitchenPath(kitchen.recipe.slug), label: 'Edit remix' },
  }} />
}

export function KitchenFormulaBakePage(props: BakeSheetProps & { formulaId: string; client: KitchenClient }) {
  const { client, ...rest } = props
  return <KitchenGate client={client}>{(store, local) => <FormulaBakeSheet {...rest} client={store} local={local} />}</KitchenGate>
}

function FormulaBakeSheet({ formulaId, client, local, ...props }: BakeSheetProps & { formulaId: string; client: KitchenClient; local: boolean }) {
  const { kitchen } = props
  const [formula, setFormula] = useState<KitchenFormula | null>(null)
  const [failure, setFailure] = useState<{ message: string; missing: boolean } | null>(null)
  const [notice, setNotice] = useState<KitchenNoticeValue | null>(null)
  // Saving from the calculator arrives with `?saved=1`.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('saved')) return
    url.searchParams.delete('saved')
    window.history.replaceState(window.history.state, '', url)
    setNotice({ message: local ? 'Saved in this browser.' : 'Saved.' })
  }, [local])
  useEffect(() => {
    let active = true
    client.read(formulaId).then((result) => {
      if (!active) return
      setFormula(result)
      // A browser formula that moved to the account keeps working at its old address.
      if (result.id !== formulaId) window.history.replaceState(window.history.state, '', kitchenPath(kitchen.recipe.slug, result.id, true))
    }, (error: unknown) => {
      if (active) setFailure({ message: kitchenErrorMessage(error, 'This bake sheet could not be loaded.'), missing: kitchenErrorCode(error) === 'not-found' })
    })
    return () => { active = false }
  }, [client, formulaId, kitchen.recipe.slug])
  if (failure) return <KitchenMessage title={failure.missing ? 'Remix not found' : 'Remix is unavailable'}
    action={<Button asChild><a href="/remix">Back to Remix</a></Button>}>{failure.message}</KitchenMessage>
  if (!formula) return <KitchenMessage title="Opening the bake sheet…" busy>Loading your remix.</KitchenMessage>
  const state = decodeKitchenState(kitchen, formula.state) ?? kitchen.defaultState
  return <><KitchenBakeSheet {...props} state={state} name={formula.name} heading={{
    crumbs: [{ label: 'Remix', href: '/remix' }, { label: formula.name }],
    title: formula.name,
    byline: byline(kitchen),
    edit: { href: kitchenPath(kitchen.recipe.slug, formula.id), label: 'Edit remix' },
  }} />
  <KitchenNotice notice={notice} onDismiss={() => setNotice(null)} /></>
}
