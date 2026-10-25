'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { useNavigate } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { useAccount } from '@eat-yeet/l6-ui-shell/account/account'
import { kitchenErrorMessage, type KitchenClient } from './kitchen-client'
import { decodeKitchenState, kitchenPath, type KitchenRecipe } from './kitchen-plugin'
import { ChangeStrip, FormulaTitle, KitchenHeader, KitchenNotice, SaveStatus, type KitchenNoticeValue } from './kitchen-ui'
import { KitchenWorkspace } from './kitchen-workspace'

// Unsaved work is a per-browser convenience; storage may be unavailable.
const scratchKey = (slug: string) => `eatyeet:kitchen:${slug}`
export function readScratch(kitchen: KitchenRecipe) {
  try {
    const raw = localStorage.getItem(scratchKey(kitchen.recipe.slug))
    return raw ? decodeKitchenState(kitchen, JSON.parse(raw)) : null
  } catch { return null }
}
const writeScratch = (slug: string, state: unknown) => { try { localStorage.setItem(scratchKey(slug), JSON.stringify(state)) } catch {} }
const clearScratch = (slug: string) => { try { localStorage.removeItem(scratchKey(slug)); localStorage.removeItem(nameKey(slug)) } catch {} }
const nameKey = (slug: string) => `${scratchKey(slug)}:name`
/** The name typed for unsaved work, if any; saving uses the recipe's title otherwise. */
export function readScratchName(slug: string) {
  try { return localStorage.getItem(nameKey(slug)) || null } catch { return null }
}
const writeScratchName = (slug: string, name: string | null) => {
  try { if (name) localStorage.setItem(nameKey(slug), name); else localStorage.removeItem(nameKey(slug)) } catch {}
}

/** Parses a `?config=` value from an older shared recipe link. */
export function sharedState(kitchen: KitchenRecipe, config?: string) {
  if (!config || config.length > 12000) return null
  try { return decodeKitchenState(kitchen, JSON.parse(config)) } catch { return null }
}

/**
 * The calculator for anyone: starts from the recipe as written, keeps
 * changes in this browser, and saves to the account only when asked.
 */
export function KitchenScratchPage({ kitchen, client, sharedConfig, saveOnArrival = false }: { kitchen: KitchenRecipe; client: KitchenClient; sharedConfig?: string; saveOnArrival?: boolean }) {
  const { recipe, plugin, config, defaultState } = kitchen
  const { member, status } = useAccount()
  const navigate = useNavigate()
  const [state, setState] = useState<unknown>(defaultState)
  const [resetKey, setResetKey] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [name, setName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<KitchenNoticeValue | null>(null)
  const arrived = useRef(false)

  useEffect(() => {
    const shared = sharedState(kitchen, sharedConfig)
    const stored = shared ?? readScratch(kitchen)
    if (shared) {
      writeScratch(recipe.slug, shared)
      setNotice({ message: 'Loaded the formula from a shared link. Save it to keep your own copy.' })
    }
    if (stored) {
      setState(stored)
      setResetKey((key) => key + 1)
    }
    setName(readScratchName(recipe.slug))
  }, [kitchen, recipe.slug, sharedConfig])

  /** Saves at once under the typed name or the recipe's title; the server picks a free variant. */
  const create = useCallback(async (values: unknown) => {
    setSaving(true)
    try {
      const formula = await client.create({ recipeSlug: recipe.slug, name: readScratchName(recipe.slug) ?? recipe.title, state: values, notes: '' })
      clearScratch(recipe.slug)
      navigate({ to: kitchenPath(recipe.slug, formula.id, true), search: { saved: '1' } })
    } catch (error) {
      setSaving(false)
      setNotice({ tone: 'error', message: kitchenErrorMessage(error, 'Your formula could not be saved. Please try again.') })
    }
  }, [client, navigate, recipe.slug, recipe.title])

  const save = useCallback(() => {
    if (errors.length || saving) return
    if (member) { void create(state); return }
    // Sign in, then come back here and save straight away.
    navigate({ to: '/account/sign-in', search: { returnTo: `${kitchenPath(recipe.slug)}?save=1` } })
  }, [errors.length, saving, member, create, state, navigate, recipe.slug])

  useEffect(() => {
    if (!saveOnArrival || arrived.current || status === 'unknown') return
    arrived.current = true
    window.history.replaceState(window.history.state, '', kitchenPath(recipe.slug))
    if (member) void create(readScratch(kitchen) ?? defaultState)
  }, [saveOnArrival, status, member, recipe.slug, create, kitchen, defaultState])

  const change = (next: unknown) => {
    setState(next)
    writeScratch(recipe.slug, next)
  }
  const reset = () => {
    setState(defaultState)
    try { localStorage.removeItem(scratchKey(recipe.slug)) } catch {}
    setResetKey((key) => key + 1)
  }
  const rename = (next: string) => {
    const kept = next === recipe.title ? null : next
    setName(kept)
    writeScratchName(recipe.slug, kept)
    return null
  }
  const saveLabel = saving ? 'Saving…' : member ? 'Save to Notebook' : 'Sign in to save'
  const bakeHref = kitchenPath(recipe.slug, undefined, true)

  return <>
    <KitchenWorkspace
      kitchen={kitchen}
      state={state}
      onChange={change}
      resetKey={resetKey}
      errors={errors}
      onErrorsChange={setErrors}
      header={<>
        <KitchenHeader
          crumbs={[{ label: 'Notebook', href: '/notebook' }, { label: recipe.title }]}
          title={<FormulaTitle name={name ?? recipe.title} onRename={rename} />}
          meta={<>
            <span>Unsaved formula from <a href={`/recipes/${recipe.slug}`} className="font-action font-bold underline decoration-1 underline-offset-4 hover:decoration-2">the recipe</a></span>
            <SaveStatus state={errors.length ? { kind: 'invalid' } : { kind: 'local' }} />
          </>}
          actions={<>
            <Button asChild variant="utility" size="sm" className="max-[640px]:hidden"><a href={bakeHref}>Bake sheet</a></Button>
            <Button disabled={errors.length > 0 || saving} onClick={save}><Save className="size-4" />{saveLabel}</Button>
          </>}
        />
        <div className="mt-6"><ChangeStrip changes={plugin.changes(recipe, config, defaultState, state)} onReset={reset} /></div>
      </>}
      aside={<section aria-labelledby="keep-it" className="grid gap-2 rounded-field bg-tint p-5">
        <h2 id="keep-it" className="font-action text-lg font-bold">Want to keep it?</h2>
        <p className="text-sm leading-relaxed">Saving keeps every change in History and opens this formula on any device. Click the name above to change it, now or later. {member ? '' : 'You’ll sign in with Google first, then come straight back.'}</p>
      </section>}
      dockAction={<Button variant="on-ink" size="sm" disabled={errors.length > 0 || saving} onClick={save}>{saving ? 'Saving…' : member ? 'Save' : 'Sign in to save'}</Button>}
    />
    <KitchenNotice notice={notice} onDismiss={() => setNotice(null)} raised />
  </>
}
