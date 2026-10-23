'use client'
import { useEffect, useState } from 'react'
import { TodayBatch, useTodayCount } from './today-batch'
import { Pencil } from 'lucide-react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { RecipeAction } from '@eat-yeet/l7-recipes/recipes/recipe-actions'
import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
import { RecipeArticle, recipeTitleClass, type RecipeArticleHeading } from '@eat-yeet/l7-recipes/recipes/recipe-article'
import type { RecipePageBlockContext } from '@eat-yeet/l7-recipes/recipes/recipe-blocks'
import { kitchenErrorCode, kitchenErrorMessage, type KitchenClient, type KitchenFormula } from './kitchen-client'
import { KitchenGate, KitchenMessage } from './kitchen-gate'
import { decodeKitchenState, kitchenPath, type KitchenRecipe } from './kitchen-plugin'
import { readScratch, readScratchName } from './kitchen-scratch'
import { FormulaTitle, KitchenNotice, type KitchenNoticeValue } from './kitchen-ui'

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
      beforeIngredients={<TodayBatch count={count} usual={usual} noun={noun} plural={plugin.batchNoun(state, 2)} onChange={setCount}
        usualNote={`The usual batch for ${name}.`} changedNote={`Just this bake. ${name} keeps ${usual}.`} />}
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
  return <KitchenBakeSheet {...props} state={state} name="This formula" heading={{
    crumbs: [{ label: 'Test Kitchen', href: '/kitchen' }, { label: title }],
    title,
    byline: 'Bake sheet · unsaved formula from this browser',
    pin: false,
    actions: <RecipeAction variant="hero" href={kitchenPath(kitchen.recipe.slug)}><Pencil className="size-3.5" />Edit formula</RecipeAction>,
  }} />
}

export function KitchenFormulaBakePage(props: BakeSheetProps & { formulaId: string; client: KitchenClient }) {
  return <KitchenGate what="this bake sheet"><FormulaBakeSheet {...props} /></KitchenGate>
}

function FormulaBakeSheet({ formulaId, client, ...props }: BakeSheetProps & { formulaId: string; client: KitchenClient }) {
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
    setNotice({ message: 'Saved to Test Kitchen. Click the name to rename it.' })
  }, [])
  useEffect(() => {
    let active = true
    client.read(formulaId).then((result) => { if (active) setFormula(result) }, (error: unknown) => {
      if (active) setFailure({ message: kitchenErrorMessage(error, 'This bake sheet could not be loaded.'), missing: kitchenErrorCode(error) === 'not-found' })
    })
    return () => { active = false }
  }, [client, formulaId])
  if (failure) return <KitchenMessage title={failure.missing ? 'Formula not found' : 'Test Kitchen is unavailable'}
    action={<Button asChild><a href="/kitchen">Back to Test Kitchen</a></Button>}>{failure.message}</KitchenMessage>
  if (!formula) return <KitchenMessage title="Opening the bake sheet…" busy>Loading your formula.</KitchenMessage>
  const state = decodeKitchenState(kitchen, formula.state) ?? kitchen.defaultState
  const rename = async (name: string) => {
    try {
      setFormula(await client.save(formula.id, { baseRevision: formula.revision, name, state: formula.state, notes: formula.notes }))
      return null
    } catch (error) { return kitchenErrorMessage(error, 'The formula could not be renamed. Please try again.') }
  }
  return <><KitchenBakeSheet {...props} state={state} name={formula.name} heading={{
    crumbs: [{ label: 'Test Kitchen', href: '/kitchen' }, { label: formula.name }],
    title: formula.name,
    titleElement: <FormulaTitle name={formula.name} onRename={rename} className={recipeTitleClass} />,
    byline: byline(kitchen),
    pin: false,
    actions: <RecipeAction variant="hero" href={kitchenPath(kitchen.recipe.slug, formula.id)}><Pencil className="size-3.5" />Edit formula</RecipeAction>,
  }} />
  <KitchenNotice notice={notice} onDismiss={() => setNotice(null)} /></>
}
