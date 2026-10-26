'use client'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { ArrowRight, Copy, History, Trash2 } from 'lucide-react'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { useNavigate } from '@eat-yeet/l5-ui-primitives/primitives/navigation'
import { useAccount } from '@eat-yeet/l6-ui-shell/account/account'
import { kitchenErrorCode, kitchenErrorMessage, type KitchenClient, type KitchenFormula, type KitchenRevision } from './kitchen-client'
import { decodeKitchenState, kitchenPath, type KitchenRecipe } from './kitchen-plugin'
import { ChangeStrip, changeSummary, FormulaTitle, HistorySheet, KitchenHeader, KitchenNotice, SaveStatus, timeAgo, type KitchenNoticeValue, type SaveState } from './kitchen-ui'
import { KitchenNotes, KitchenWorkspace } from './kitchen-workspace'
import { KitchenGate, KitchenMessage } from './kitchen-gate'

type Draft = { name: string; state: unknown; notes: string }
const AUTOSAVE_DELAY = 800

/**
 * Loads a member's formula and saves edits automatically. Each save carries
 * the revision it started from, so another tab's newer save is never
 * overwritten; edits stay on the page whenever a save fails.
 */
export function useKitchenFormula(client: KitchenClient, id: string, kitchen: KitchenRecipe) {
  const [formula, setFormula] = useState<KitchenFormula | null>(null)
  const [loadError, setLoadError] = useState<{ message: string; missing: boolean } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [save, setSave] = useState<SaveState>({ kind: 'saved', at: null })
  const [resetKey, setResetKey] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [mismatch, setMismatch] = useState(false)
  const draftRef = useRef<Draft | null>(null)
  const baseRef = useRef(0)
  const pendingRef = useRef(false)
  const errorsRef = useRef<string[]>([])
  const inflightRef = useRef<Promise<string | null> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const accept = useCallback((result: KitchenFormula, replaceDraft: boolean) => {
    setFormula(result)
    baseRef.current = result.revision
    if (!replaceDraft) return
    const decoded = decodeKitchenState(kitchen, result.state)
    setMismatch(decoded === null)
    draftRef.current = { name: result.name, state: decoded ?? kitchen.defaultState, notes: result.notes }
    setDraft(draftRef.current)
    pendingRef.current = false
    setResetKey((key) => key + 1)
  }, [kitchen])

  const load = useCallback(async () => {
    setLoadError(null)
    try { accept(await client.read(id), true) }
    catch (error) {
      setLoadError({ message: kitchenErrorMessage(error, 'This formula could not be loaded.'), missing: kitchenErrorCode(error) === 'not-found' })
    }
  }, [client, id, accept])

  const flushRef = useRef<() => Promise<string | null>>(async () => null)
  const schedule = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_DELAY)
  }, [])

  const flush = useCallback(async (): Promise<string | null> => {
    clearTimeout(timerRef.current)
    if (inflightRef.current) await inflightRef.current
    if (!pendingRef.current || !draftRef.current) return null
    if (errorsRef.current.length) { setSave({ kind: 'invalid' }); return null }
    pendingRef.current = false
    const sent = draftRef.current
    setSave({ kind: 'saving' })
    const run = client.save(id, { baseRevision: baseRef.current, ...sent }).then((result) => {
      accept(result, false)
      setSave({ kind: 'saved', at: Date.now() })
      return null
    }, (error: unknown) => {
      pendingRef.current = true
      const message = kitchenErrorMessage(error, 'Couldn’t save. Your edits are kept here.')
      if (kitchenErrorCode(error) === 'conflict') setSave({ kind: 'error', message: 'Changed in another tab. Reload to see the latest version.', retry: () => window.location.reload() })
      else setSave({ kind: 'error', message: 'Couldn’t save. Your edits are kept here.', retry: () => { void flushRef.current() } })
      return message
    }).finally(() => { inflightRef.current = null })
    inflightRef.current = run
    const failure = await run
    if (!failure && pendingRef.current) schedule()
    return failure
  }, [client, id, accept, schedule])
  flushRef.current = flush

  const update = useCallback((changes: Partial<Draft>) => {
    if (!draftRef.current) return
    draftRef.current = { ...draftRef.current, ...changes }
    setDraft(draftRef.current)
    pendingRef.current = true
    if (errorsRef.current.length) setSave({ kind: 'invalid' })
    else schedule()
  }, [schedule])

  const reportErrors = useCallback((next: string[]) => {
    errorsRef.current = next
    setErrors((current) => current.join('\n') === next.join('\n') ? current : next)
    if (!pendingRef.current) return
    if (next.length) { clearTimeout(timerRef.current); setSave({ kind: 'invalid' }) }
    else schedule()
  }, [schedule])

  /** Replaces the draft from the server, e.g. after Restore. */
  const replace = useCallback(async (request: () => Promise<KitchenFormula>) => {
    await flush()
    const result = await request()
    accept(result, true)
    setSave({ kind: 'saved', at: Date.now() })
    return result
  }, [flush, accept])

  const resetTo = useCallback((state: unknown) => {
    update({ state })
    setResetKey((key) => key + 1)
  }, [update])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (!pendingRef.current && !inflightRef.current) return
      void flushRef.current()
      event.preventDefault()
    }
    const hidden = () => { if (document.visibilityState === 'hidden') void flushRef.current() }
    window.addEventListener('beforeunload', leave)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('beforeunload', leave)
      document.removeEventListener('visibilitychange', hidden)
      clearTimeout(timerRef.current)
    }
  }, [])

  return { formula, draft, loadError, reload: load, save, errors, reportErrors, resetKey, update, resetTo, flush, replace, accept, mismatch, baseRef, draftRef }
}

/** History text: what changed from the previous version, including the name and notes. */
export function describeRevision(kitchen: KitchenRecipe, revision: KitchenRevision, previous: KitchenRevision | null) {
  if (!previous) return 'Earliest kept version'
  const changes = kitchen.plugin.changes(kitchen.recipe, kitchen.config, previous.state, revision.state)
  if (previous.name !== revision.name) changes.unshift({ label: 'Name', from: previous.name, to: revision.name })
  const text = changes.length ? changeSummary(changes) : ''
  if (previous.notes !== revision.notes) return text ? `${text} · Notes edited` : 'Notes edited'
  return text || 'No value changes'
}

export function KitchenFormulaPage({ kitchen, formulaId, client }: { kitchen: KitchenRecipe; formulaId: string; client: KitchenClient }) {
  return <KitchenGate what="this formula">
    <KitchenFormulaEditor kitchen={kitchen} formulaId={formulaId} client={client} />
  </KitchenGate>
}

function KitchenFormulaEditor({ kitchen, formulaId, client }: { kitchen: KitchenRecipe; formulaId: string; client: KitchenClient }) {
  const { recipe, plugin, config, defaultState } = kitchen
  const navigate = useNavigate()
  const editor = useKitchenFormula(client, formulaId, kitchen)
  const { formula, draft, save, errors } = editor
  const [historyOpen, setHistoryOpen] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [notice, setNotice] = useState<KitchenNoticeValue | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  // A new copy arrives with `?copied=1` and opens with its name selected.
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('copied')) return
    url.searchParams.delete('copied')
    window.history.replaceState(window.history.state, '', url)
    setCopied(true)
    setNotice({ message: 'Copy created. The original is unchanged.' })
  }, [])

  if (editor.loadError) return <KitchenMessage title={editor.loadError.missing ? 'Formula not found' : 'Notebook is unavailable'}
    action={editor.loadError.missing ? <Button asChild><a href="/notebook">Back to Notebook</a></Button> : <Button onClick={() => void editor.reload()}>Try again</Button>}>
    {editor.loadError.missing ? 'It may have been deleted, or it belongs to another account.' : editor.loadError.message}
  </KitchenMessage>
  if (!formula || !draft) return <KitchenMessage title="Loading your formula…" busy>Your formula and its history are on their way.</KitchenMessage>

  const changes = plugin.changes(recipe, config, defaultState, draft.state)
  const revisions = formula.revisions
  const restore = async (revision: KitchenRevision) => {
    const undoTo = revisions[0]
    setRestoring(revision.id)
    try {
      await editor.replace(() => client.restore(formulaId, revision.id))
      setHistoryOpen(false)
      setNotice({ message: `Restored the version from ${timeAgo(revision.createdAt)}.`, action: undoTo ? { label: 'Undo', run: () => { void editor.replace(() => client.restore(formulaId, undoTo.id)).catch(() => setNotice({ tone: 'error', message: 'Undo failed. Open History to choose a version.' })) } } : undefined })
    } catch (error) {
      setNotice({ tone: 'error', message: kitchenErrorMessage(error, 'That version could not be restored. Please try again.') })
    } finally { setRestoring(null) }
  }
  const rename = async (name: string) => {
    const failure = await editor.flush()
    if (failure) return failure
    try {
      editor.accept(await client.save(formulaId, { baseRevision: editor.baseRef.current, ...editor.draftRef.current!, name }), true)
      return null
    } catch (error) { return kitchenErrorMessage(error, 'The formula could not be renamed. Please try again.') }
  }
  /** The copy takes the next free "<name> copy" name and opens ready to rename. */
  const duplicate = async () => {
    setDuplicating(true)
    try {
      const failure = await editor.flush()
      if (failure) throw new Error(failure)
      const copy = await client.duplicate(formulaId, `${draft.name} copy`)
      navigate({ to: kitchenPath(recipe.slug, copy.id), search: { copied: '1' } })
    } catch (error) {
      setDuplicating(false)
      setNotice({ tone: 'error', message: kitchenErrorMessage(error, 'The copy could not be created. Please try again.') })
    }
  }
  const remove = async () => {
    setDeleting(true)
    try {
      await editor.flush()
      await client.remove(formulaId)
      navigate({ to: '/notebook', search: { deleted: formulaId } })
    } catch (error) {
      setDeleting(false)
      setNotice({ tone: 'error', message: kitchenErrorMessage(error, 'The formula could not be deleted. Please try again.') })
    }
  }
  const bakeHref = kitchenPath(recipe.slug, formulaId, true)
  const openBakeSheet = async (event: MouseEvent) => {
    event.preventDefault()
    await editor.flush()
    navigate({ to: bakeHref })
  }

  return <>
    <KitchenWorkspace
      kitchen={kitchen}
      state={draft.state}
      onChange={(state) => editor.update({ state })}
      resetKey={editor.resetKey}
      errors={errors}
      onErrorsChange={editor.reportErrors}
      header={<>
        <KitchenHeader
          crumbs={[{ label: 'Notebook', href: '/notebook' }, { label: draft.name, href: bakeHref }, { label: 'Edit' }]}
          title={<FormulaTitle key={formulaId} name={draft.name} onRename={rename} autoEdit={copied} />}
          meta={<>
            <span>From <a href={`/recipes/${recipe.slug}`} className="font-action font-bold underline decoration-1 underline-offset-4 hover:decoration-2">{recipe.title}</a></span>
            <SaveStatus state={save} />
          </>}
          actions={<>
            <Button variant="utility" size="sm" onClick={() => setHistoryOpen(true)}><History className="size-4" />History</Button>
            <Button variant="utility" size="sm" disabled={duplicating} onClick={() => void duplicate()}><Copy className="size-4" />{duplicating ? 'Copying…' : 'Duplicate'}</Button>
            <Button asChild className="max-[640px]:hidden"><a href={bakeHref} onClick={openBakeSheet}>Apply<ArrowRight className="size-4" /></a></Button>
          </>}
        />
        {editor.mismatch && <p role="status" className="mt-4 rounded-field bg-tint p-4 text-sm">This formula no longer matches the recipe’s options, so it opens with the recipe’s values. Your earlier versions are still in History.</p>}
        <div className="mt-6"><ChangeStrip changes={changes} onReset={() => editor.resetTo(defaultState)} /></div>
      </>}
      notes={<KitchenNotes value={draft.notes} onChange={(notes) => editor.update({ notes })} />}
      footer={<div className="border-t border-border pt-6">
        <Button variant="danger" size="sm" disabled={deleting} onClick={() => void remove()}><Trash2 className="size-4" />{deleting ? 'Deleting…' : 'Delete formula'}</Button>
        <p className="mt-2 text-xs text-muted-foreground">Deleted formulas stay in Recently deleted for 30 days.</p>
      </div>}
      aside={<section aria-labelledby="recent-changes" className="grid gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent-changes" className="font-action text-lg font-bold">Recent changes</h2>
          <Button variant="link" className="text-[13px]" onClick={() => setHistoryOpen(true)}>All history</Button>
        </div>
        <ul>{revisions.slice(0, 3).map((revision, index) => <li key={revision.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border py-3 text-sm leading-snug last:border-b-0">
          <span>{index === revisions.length - 1 && revisions.length < 100 ? 'Created' : describeRevision(kitchen, revision, revisions[index + 1] ?? null)}</span>
          <span className="whitespace-nowrap text-muted-foreground">{timeAgo(revision.updatedAt)}</span>
        </li>)}</ul>
      </section>}
      dockAction={<Button asChild variant="on-ink" size="sm"><a href={bakeHref} onClick={openBakeSheet}>Apply</a></Button>}
    />
    <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} title={draft.name} revisions={revisions}
      complete={revisions.length < 100} restoring={restoring} onRestore={(revision) => void restore(revision)}
      describe={(revision, previous) => describeRevision(kitchen, revision, previous)} />
    <KitchenNotice notice={notice} onDismiss={() => setNotice(null)} raised />
  </>
}
