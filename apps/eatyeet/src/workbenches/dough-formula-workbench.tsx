import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import {
  calculateFormula,
  calculateLevainBuild,
  formatGrams,
  formatPercent,
  reverseFormula,
  type DoughBatch,
  type DoughFormula,
  type FlourComponent,
  type StarterProfile,
} from '@eat-yeet/l2-recipe-domain/formula'
import type { RecipeBlock, RecipeContent, RecipeContentMethod } from '@eat-yeet/l4-content-model/recipes'
import { recipeWithSelectedMethod, selectedRecipeMethod } from '@eat-yeet/l4-content-model/recipes'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@eat-yeet/l5-ui-primitives/primitives/dialog'
import type { RecipeWorkbenchDrawerProps, RecipeWorkbenchPlugin } from '@eat-yeet/l7-recipes/recipes/workbench-registry'

type InputMode = 'weights' | 'target'

interface DoughWorkbenchState {
  version: 1
  batch: DoughBatch
  formula: DoughFormula
  methodId: string
}

interface DoughWorkbenchConfig {
  defaultInputMode: InputMode
  defaultSelection: DoughWorkbenchState
  recommendedFormulas: Record<string, DoughFormula>
  doughIngredientSectionId?: string
  hiddenIngredientSectionIds?: string[]
  initialWaterPercent?: number
  perPieceIngredientLabel?: string
  perPieceIngredientQuantities?: Record<string, { quantity: number; unit: string }>
}

export interface FormulaPreset {
  id: string
  name: string
  formula: DoughFormula
}

type WorkbenchStore = {
  modes: Record<string, InputMode>
  presets: FormulaPreset[]
  starterProfiles: Array<{ id: string; name: string; profile: StarterProfile }>
  defaults: Record<string, string>
}

const EMPTY_STORE: WorkbenchStore = { modes: {}, presets: [], starterProfiles: [], defaults: {} }
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const number = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0
const slugId = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `flour-${Date.now()}`
const pieceCountLabel = (count: number, label: 'loaf' | 'ball') => label === 'loaf' ? (count === 1 ? 'loaf' : 'loaves') : (count === 1 ? 'ball' : 'balls')
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const inputValue = (value: number, unit?: string) => {
  if (!Number.isFinite(value)) return ''
  if (unit === 'g') return value < 10 ? value.toFixed(2) : value.toFixed(1)
  if (unit === '%') return String(Number(value.toFixed(2)))
  return String(value)
}
const formatAppliedGrams = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  return `${value < 20 ? value.toFixed(1) : Math.round(value)}g`
}
const formulasMatch = (left: DoughFormula, right: DoughFormula) => JSON.stringify(left) === JSON.stringify(right)

function presetSummary(formula: DoughFormula) {
  const parts = [`${formatPercent(formula.hydrationPercent)} hydration`, `${formatPercent(formula.saltPercent)} salt`]
  if (formula.family === 'pizza') {
    if (formula.oilPercent > 0) parts.push(`${formatPercent(formula.oilPercent)} oil`)
    if (formula.yeastPercent > 0) parts.push(`${formatPercent(formula.yeastPercent)} yeast`)
  } else if (formula.levainPercent > 0) {
    parts.push(`${formatPercent(formula.levainPercent)} levain`)
  }
  return parts.join(' · ')
}

function readStore(key: string): { store: WorkbenchStore; error: string } {
  try {
    const serialized = localStorage.getItem(key)
    if (!serialized) return { store: clone(EMPTY_STORE), error: '' }
    const value = JSON.parse(serialized)
    const store = value && typeof value === 'object'
      ? { ...EMPTY_STORE, ...value, modes: value.modes ?? {}, defaults: value.defaults ?? {}, presets: value.presets ?? [], starterProfiles: value.starterProfiles ?? [] }
      : clone(EMPTY_STORE)
    return { store, error: '' }
  } catch {
    return { store: clone(EMPTY_STORE), error: 'Saved formulas could not be read. The calculator is using the authored recipe.' }
  }
}

function saveStore(key: string, store: WorkbenchStore) {
  try {
    localStorage.setItem(key, JSON.stringify(store))
    return ''
  } catch {
    return 'This browser could not save your presets. The calculator still works.'
  }
}

export function selectionSummary(selection: DoughWorkbenchState, method?: RecipeContentMethod | null, formatWeight = formatGrams) {
  const { batch, formula } = selection
  const pieces = `${batch.count} ${pieceCountLabel(batch.count, batch.pieceLabel)} × ${formatWeight(batch.pieceWeightGrams)}`
  return [pieces, method?.label, `${formatPercent(formula.hydrationPercent)} hydration`].filter(Boolean).join(' · ')
}

function dynamicDoughItems(selection: DoughWorkbenchState, formatWeight = formatGrams) {
  const result = calculateFormula(selection.formula, selection.batch)
  const items = result.freshFlour.filter((part) => part.grams > 0.005).map((part) => `${formatWeight(part.grams)} ${part.name}`)
  items.push(`${formatWeight(result.addedWaterGrams)} water`)
  if (result.levainGrams > 0) items.push(`${formatWeight(result.levainGrams)} ripe levain (${formatPercent(selection.formula.starter?.hydrationPercent ?? 0)} hydration)`)
  if (result.oilGrams > 0.005) items.push(`${formatWeight(result.oilGrams)} oil`)
  if (result.sugarGrams > 0.005) items.push(`${formatWeight(result.sugarGrams)} sugar`)
  if (result.maltGrams > 0.005) items.push(`${formatWeight(result.maltGrams)} malt powder`)
  if (result.yeastGrams > 0.005) items.push(`${formatWeight(result.yeastGrams)} instant yeast`)
  items.push(`${formatWeight(result.saltGrams)} salt`)
  return { result, items }
}

function renderFormulaBindings(value: string, selection: DoughWorkbenchState, config: DoughWorkbenchConfig) {
  const { result } = dynamicDoughItems(selection)
  const initialWaterGrams = result.addedWaterGrams * ((config.initialWaterPercent ?? 100) / 100)
  const remainingWaterGrams = result.addedWaterGrams - initialWaterGrams
  const ingredients = ['water', 'flour']
  if (result.oilGrams > 0.005) ingredients.push('oil')
  if (result.sugarGrams > 0.005) ingredients.push('sugar')
  if (result.maltGrams > 0.005) ingredients.push('malt powder')
  ingredients.push('salt')
  if (result.yeastGrams > 0.005) ingredients.push('yeast')
  const mixingIngredients = ingredients.length < 2 ? ingredients.join('') : `${ingredients.slice(0, -1).join(', ')}, and ${ingredients.at(-1)}`
  const plural = pieceCountLabel(selection.batch.count, selection.batch.pieceLabel)
  const bindings: Record<string, string> = {
    initialWaterGrams: formatAppliedGrams(initialWaterGrams),
    remainingWaterGrams: formatAppliedGrams(remainingWaterGrams),
    pieceCount: String(selection.batch.count),
    pieceLabelPlural: plural,
    pieceWeightGrams: formatAppliedGrams(selection.batch.pieceWeightGrams),
    totalDoughGrams: formatAppliedGrams(result.totalDoughGrams),
    mixingIngredients,
  }
  return value.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g, (token, key) => bindings[key] ?? token)
}

export function resolveWorkbenchRecipe(recipe: RecipeContent, selection: DoughWorkbenchState, config: DoughWorkbenchConfig): RecipeContent {
  const selected = recipeWithSelectedMethod(recipe, selection.methodId)
  if (!recipe.workbench) return selected
  const { result, items: rawItems } = dynamicDoughItems(selection, formatAppliedGrams)
  const items = rawItems.map(escapeHtml)
  const blocks = selected.blocks.map((block) => {
    if (block.type !== 'recipe') return block
    const doughTitle = selection.formula.family === 'pizza' ? 'Dough' : 'Bread dough'
    const doughSectionId = config.doughIngredientSectionId ?? 'dough'
    const replacedSectionIds = new Set([doughSectionId, ...(config.hiddenIngredientSectionIds ?? [])])
    const otherIngredients = block.ingredients.filter((section) => !replacedSectionIds.has(section.id))
    const ingredients = [{ id: doughSectionId, title: doughTitle, items, itemIds: result.freshFlour.filter((part) => part.grams > 0.005).map((part) => `flour-${part.id}`).concat(['water'], result.levainGrams > 0 ? ['levain'] : [], result.oilGrams > 0.005 ? ['oil'] : [], result.sugarGrams > 0.005 ? ['sugar'] : [], result.maltGrams > 0.005 ? ['malt'] : [], result.yeastGrams > 0.005 ? ['yeast'] : [], ['salt']) }, ...otherIngredients.map((section) => {
      const label = config.perPieceIngredientLabel ?? selection.batch.pieceLabel
      return {
        ...section,
        title: section.id === 'pizza-toppings' ? `Pizza toppings (per ${label}; ${selection.batch.count} total)` : section.title,
        items: section.items.map((item, index) => {
          const quantity = config.perPieceIngredientQuantities?.[section.itemIds[index]]
          if (!quantity) return item
          const display = (amount: number) => {
            const eighths = Math.round(amount * 8)
            if ((quantity.unit === 'tsp' || quantity.unit === 'tbsp') && Math.abs(amount * 8 - eighths) < 0.0001) {
              const whole = Math.floor(eighths / 8)
              const remainder = eighths % 8
              const fractions: Record<number, string> = { 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' }
              const value = remainder === 0 ? String(whole) : `${whole > 0 ? `${whole} ` : ''}${fractions[remainder]}`
              return `${value} ${quantity.unit}`
            }
            return `${Number(amount.toFixed(2))} ${quantity.unit}`
          }
          return `${display(quantity.quantity)} ${item} (${display(quantity.quantity * selection.batch.count)} total)`
        }),
      }
    })]
    const steps = block.steps.map((section) => ({
      ...section,
      items: section.items.map((item) => renderFormulaBindings(item, selection, config)),
    }))
    const formulaNote = selection.formula.family === 'pizza'
      ? `This dough is ${formatPercent(selection.formula.hydrationPercent)} hydration and makes ${selection.batch.count} × ${formatAppliedGrams(selection.batch.pieceWeightGrams)} balls (${formatAppliedGrams(result.totalDoughGrams)} total).`
      : `This dough is ${formatPercent(selection.formula.hydrationPercent)} hydration with ${formatPercent(result.prefermentedFlourPercent)} prefermented flour and makes ${selection.batch.count} × ${formatAppliedGrams(selection.batch.pieceWeightGrams)} ${pieceCountLabel(selection.batch.count, 'loaf')}.`
    const notes = [formulaNote, ...block.notes.filter((note) => !/formula uses|dough formula|lands around/i.test(note))]
    return { ...block, ingredients, steps, notes }
  })
  const count = selection.batch.count
  return {
    ...selected,
    blocks,
    yieldAmount: count,
    yieldUnit: selection.formula.family === 'pizza' ? 'pizzas' : count === 1 ? 'loaf' : 'loaves',
    description: selection.formula.family === 'pizza'
      ? `${selected.description} The applied formula is ${formatPercent(selection.formula.hydrationPercent)} hydration and makes ${count} dough ball${count === 1 ? '' : 's'}.`
      : `${selected.description} The applied formula is ${formatPercent(selection.formula.hydrationPercent)} hydration and makes ${count} ${pieceCountLabel(count, 'loaf')}.`,
  }
}

function Field({ label, value, onChange, suffix, step = '0.1', min = 0 }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: string; min?: number }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-extrabold uppercase tracking-[0.7px] text-[var(--yeet-gray)]">
      {label}
      <span className="flex min-w-0 items-center border border-[var(--yeet-border)] bg-white focus-within:border-[var(--yeet-tomato)]">
        <input className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base font-normal tracking-normal outline-none" type="number" inputMode="decimal" min={min} step={step} value={inputValue(value, suffix)} onChange={(event) => onChange(number(event.target.value))} />
        {suffix && <span className="pr-3 text-xs text-[var(--yeet-gray)]">{suffix}</span>}
      </span>
    </label>
  )
}

function FlourEditor({ value, onChange, unit = '%' }: { value: FlourComponent[]; onChange: (value: FlourComponent[]) => void; unit?: '%' | 'g' }) {
  return (
    <div className="grid gap-2">
      {value.map((part, index) => (
        <div key={`${part.id}-${index}`} className="grid grid-cols-[minmax(0,1fr)_108px_32px] gap-2">
          <input aria-label={`Flour ${index + 1} name`} className="border border-[var(--yeet-border)] px-3 py-2 outline-none focus:border-[var(--yeet-tomato)]" value={part.name} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value, id: slugId(event.target.value) } : item))} />
          <label className="flex items-center border border-[var(--yeet-border)] focus-within:border-[var(--yeet-tomato)]">
            <span className="sr-only">{part.name || `Flour ${index + 1}`} {unit === '%' ? 'percentage' : 'grams'}</span>
            <input className="min-w-0 flex-1 px-2 py-2 text-right outline-none" type="number" inputMode="decimal" min="0" step="0.1" value={inputValue(part.percent, unit)} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, percent: number(event.target.value) } : item))} />
            <span className="pr-2 text-xs">{unit}</span>
          </label>
          <button type="button" className="border border-[var(--yeet-border)] text-[var(--yeet-gray)] hover:text-[var(--yeet-tomato)] disabled:opacity-30" disabled={value.length === 1} aria-label={`Remove ${part.name || 'flour'}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="mx-auto size-4" /></button>
        </div>
      ))}
      <button type="button" className="flex items-center gap-1 text-sm font-bold text-[var(--yeet-tomato-strong)]" onClick={() => onChange([...value, { id: `flour-${Date.now()}`, name: '', percent: 0 }])}><Plus className="size-4" /> Add flour</button>
    </div>
  )
}

function Segmented({ value, onChange }: { value: InputMode; onChange: (value: InputMode) => void }) {
  return (
    <div className="grid grid-cols-2 border border-[var(--yeet-border)] p-1" aria-label="Calculator input mode">
      {([['weights', 'Ingredient weights'], ['target', 'Target batch']] as const).map(([id, label]) => (
        <button key={id} type="button" aria-pressed={value === id} className={`min-h-10 px-3 text-xs font-extrabold uppercase ${value === id ? 'bg-[var(--yeet-tomato-strong)] text-white' : 'text-[var(--yeet-gray)] hover:bg-[var(--yeet-light-pink)]'}`} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  )
}

function starterFrom(formula: DoughFormula): StarterProfile {
  return clone(formula.starter ?? { hydrationPercent: 77, flour: formula.flour })
}

function DoughFormulaWorkbench({
  recipe,
  config,
  selection,
  onApply,
  hasSharedConfiguration,
  storageScope,
  open,
  onOpenChange,
}: {
  recipe: RecipeContent
  config: DoughWorkbenchConfig
  selection: DoughWorkbenchState
  onApply: (selection: DoughWorkbenchState) => void
  hasSharedConfiguration: boolean
  storageScope: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [draft, setDraft] = useState(() => clone(selection))
  const [mode, setMode] = useState<InputMode>(config.defaultInputMode)
  const [store, setStore] = useState<WorkbenchStore>(EMPTY_STORE)
  const [storeError, setStoreError] = useState('')
  const [presetName, setPresetName] = useState('')
  const [starterName, setStarterName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [selectedStarterId, setSelectedStarterId] = useState('')
  const [buildOpen, setBuildOpen] = useState(false)
  const [seedRatio, setSeedRatio] = useState(2)
  const [seed, setSeed] = useState(() => starterFrom(selection.formula))
  const storageKey = `${storageScope}:recipe-workbench:v1`
  const result = useMemo(() => calculateFormula(draft.formula, draft.batch), [draft])
  const reverseRows = result.freshFlour.map((part) => ({ ...part, percent: part.grams }))
  const method = selectedRecipeMethod(recipe, draft.methodId)
  const build = draft.formula.starter && result.levainGrams > 0 ? calculateLevainBuild(result.levainGrams, draft.formula.starter, seed, seedRatio) : null
  const errors = [...result.errors, ...(buildOpen && build ? build.errors : [])]
  const compatiblePresets = store.presets.filter((preset) => preset.formula.family === draft.formula.family)
  const activePresetId = compatiblePresets.find((preset) => preset.id === selectedPresetId && formulasMatch(preset.formula, draft.formula))?.id ?? ''

  useEffect(() => {
    const { store: saved, error } = readStore(storageKey)
    setStore(saved)
    setStoreError(error)
    setMode(saved.modes[recipe.slug] ?? config.defaultInputMode)
    if (!hasSharedConfiguration) {
      const defaultId = saved.defaults[recipe.slug]
      const preset = saved.presets.find((item) => item.id === defaultId && item.formula.family === selection.formula.family)
      if (preset) onApply({ ...selection, formula: clone(preset.formula) })
    }
  }, [storageKey, recipe.slug])

  useEffect(() => {
    if (!open) return
    setDraft(clone(selection))
    setSeed(starterFrom(selection.formula))
    document.body.dataset.workbenchOpen = 'true'
    return () => { delete document.body.dataset.workbenchOpen }
  }, [open, selection])

  const persist = (next: WorkbenchStore) => {
    setStore(next)
    setStoreError(saveStore(storageKey, next))
  }
  const changeMode = (next: InputMode) => {
    setMode(next)
    persist({ ...store, modes: { ...store.modes, [recipe.slug]: next } })
  }
  const updateFormula = (changes: Partial<DoughFormula>) => setDraft((current) => ({ ...current, formula: { ...current.formula, ...changes } }))
  const applyReverse = (changes: Partial<{ freshFlour: FlourComponent[]; addedWaterGrams: number; saltGrams: number; oilGrams: number; sugarGrams: number; maltGrams: number; yeastGrams: number; levainGrams: number; starter: StarterProfile }>) => {
    const current = calculateFormula(draft.formula, draft.batch)
    const nextRows = changes.freshFlour ?? current.freshFlour.map((part) => ({ ...part, percent: part.grams }))
    const reversed = reverseFormula({
      family: draft.formula.family,
      freshFlour: nextRows.map((part) => ({ id: part.id, name: part.name, grams: part.percent })),
      addedWaterGrams: changes.addedWaterGrams ?? current.addedWaterGrams,
      saltGrams: changes.saltGrams ?? current.saltGrams,
      oilGrams: changes.oilGrams ?? current.oilGrams,
      sugarGrams: changes.sugarGrams ?? current.sugarGrams,
      maltGrams: changes.maltGrams ?? current.maltGrams,
      yeastGrams: changes.yeastGrams ?? current.yeastGrams,
      levainGrams: changes.levainGrams ?? current.levainGrams,
      starter: draft.formula.family === 'sourdough' ? changes.starter ?? starterFrom(draft.formula) : undefined,
    })
    setDraft((currentDraft) => ({ ...currentDraft, formula: reversed.formula, batch: { ...currentDraft.batch, pieceWeightGrams: reversed.totalDoughGrams / currentDraft.batch.count } }))
  }
  const savePreset = (replaceId?: string) => {
    const name = presetName.trim()
    if (!name || errors.length) return
    const item = { id: replaceId ?? `${Date.now()}`, name, formula: clone(draft.formula) }
    persist({ ...store, presets: replaceId ? store.presets.map((preset) => preset.id === replaceId ? item : preset) : [...store.presets, item] })
    setSelectedPresetId(item.id)
    setPresetName(item.name)
  }
  const saveStarterProfile = (replaceId?: string) => {
    const name = starterName.trim()
    const profile = draft.formula.starter
    if (!name || !profile || errors.length) return
    const item = { id: replaceId ?? `${Date.now()}`, name, profile: clone(profile) }
    persist({ ...store, starterProfiles: replaceId ? store.starterProfiles.map((saved) => saved.id === replaceId ? item : saved) : [...store.starterProfiles, item] })
    setSelectedStarterId(item.id)
    setStarterName(item.name)
  }

  return (
      <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setDraft(clone(selection)) }}>
        <DialogContent overlayClassName="z-[var(--z-workbench)]" data-workbench-drawer="" aria-describedby="workbench-description" className="yeet top-0 right-0 bottom-0 left-auto z-[var(--z-workbench)] flex h-[100dvh] w-full !max-w-[600px] translate-x-0 translate-y-0 flex-col gap-0 overflow-x-hidden rounded-none border-0 bg-white p-0 text-[var(--yeet-gray)] shadow-none ring-0 max-[640px]:!w-full max-[640px]:!max-w-none data-open:zoom-in-100 data-closed:zoom-out-100 data-open:slide-in-from-right data-closed:slide-out-to-right motion-reduce:transition-none">
          <header className="shrink-0 border-b border-[var(--yeet-border)] px-6 py-5 pr-14 max-[640px]:px-[18px]">
            <DialogTitle className="text-[30px] leading-none font-bold">Adjust recipe</DialogTitle>
            <DialogDescription id="workbench-description" className="mt-2 text-sm text-[var(--yeet-gray)]">Build the batch you want, preview the weights, then apply it to the whole recipe.</DialogDescription>
          </header>
          <div data-workbench-scroll-region="" className="min-h-0 min-w-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-5 max-[640px]:px-[18px]">
            <Segmented value={mode} onChange={changeMode} />

            <section className="mt-6 grid gap-3 border-b border-[var(--yeet-border)] pb-6" aria-labelledby="presets-heading">
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 id="presets-heading" className="text-xl font-bold">Saved formulas</h3>
                  <span className="text-xs font-bold uppercase text-[var(--yeet-gray)]">{compatiblePresets.length} saved</span>
                </div>
                <p className="mt-1 text-sm">Load a formula here. Batch size and oven stay separate until you apply the recipe.</p>
              </div>
              {compatiblePresets.length === 0 ? (
                <p className="border-y border-[var(--yeet-border)] py-3 text-sm text-[var(--yeet-gray)]">No saved formulas yet.</p>
              ) : (
                <ul className="grid border-t border-[var(--yeet-border)]">
                  {compatiblePresets.map((preset) => {
                    const isLoaded = activePresetId === preset.id
                    const isModified = selectedPresetId === preset.id && !isLoaded
                    const isDefault = store.defaults[recipe.slug] === preset.id
                    return (
                      <li key={preset.id} className="grid gap-2 border-b border-[var(--yeet-border)] py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold">{preset.name}</div>
                            <div className="mt-0.5 text-xs text-[var(--yeet-gray)]">{presetSummary(preset.formula)}</div>
                          </div>
                          <div className="flex shrink-0 gap-1 text-[10px] font-extrabold uppercase tracking-[0.6px]">
                            {isLoaded && <span className="bg-[var(--yeet-light-pink)] px-2 py-1">Loaded</span>}
                            {isModified && <span className="border border-[var(--yeet-border)] px-2 py-1">Modified</span>}
                            {isDefault && <span className="border border-[var(--yeet-border)] px-2 py-1">Default</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold">
                          <button type="button" aria-label={`Load ${preset.name}`} className="text-[var(--yeet-tomato-strong)] underline underline-offset-4" onClick={() => { setDraft((current) => ({ ...current, formula: clone(preset.formula) })); setSelectedPresetId(preset.id); setPresetName(preset.name) }}>Load</button>
                          <button type="button" className="underline underline-offset-4" onClick={() => persist({ ...store, defaults: { ...store.defaults, [recipe.slug]: preset.id } })}>{isDefault ? 'Default' : 'Make default'}</button>
                          <button type="button" aria-label={`Delete ${preset.name}`} className="ml-auto inline-flex items-center gap-1 text-[var(--yeet-tomato-strong)]" onClick={() => { persist({ ...store, presets: store.presets.filter((item) => item.id !== preset.id), defaults: Object.fromEntries(Object.entries(store.defaults).filter(([, id]) => id !== preset.id)) }); if (selectedPresetId === preset.id) { setSelectedPresetId(''); setPresetName('') } }}><Trash2 className="size-3.5" />Delete</button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input aria-label="Formula preset name" placeholder="Formula name" className="min-w-0 border border-[var(--yeet-border)] px-3 py-2" value={presetName} onChange={(event) => setPresetName(event.target.value)} />
                <button type="button" className="border border-[var(--yeet-gray)] px-3 text-xs font-extrabold uppercase disabled:opacity-40" disabled={!presetName.trim() || errors.length > 0} onClick={() => savePreset()}>Save new</button>
              </div>
              {selectedPresetId && <div className="flex items-center justify-between gap-3 text-sm"><span>Rename or replace the selected formula using the name above.</span><button type="button" className="shrink-0 font-bold uppercase text-[var(--yeet-tomato-strong)] disabled:opacity-40" disabled={!presetName.trim() || errors.length > 0} onClick={() => savePreset(selectedPresetId)}>Replace</button></div>}
              {storeError && <p role="status" className="text-sm text-[var(--yeet-tomato-strong)]">{storeError}</p>}
            </section>

            <section className="mt-6 grid gap-4" aria-labelledby="batch-heading">
              <h3 id="batch-heading" className="text-xl font-bold">Batch</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label={pieceCountLabel(2, draft.batch.pieceLabel)} value={draft.batch.count} min={1} step="1" onChange={(count) => setDraft((current) => ({ ...current, batch: { ...current.batch, count: Math.max(1, Math.round(count)) } }))} />
                <Field label={`${draft.batch.pieceLabel} weight`} suffix="g" value={draft.batch.pieceWeightGrams} onChange={(pieceWeightGrams) => setDraft((current) => ({ ...current, batch: { ...current.batch, pieceWeightGrams } }))} />
              </div>
              {recipe.methodOptions.length > 1 && <label className="grid gap-1 text-xs font-extrabold uppercase tracking-[0.7px]">Oven method<select className="border border-[var(--yeet-border)] bg-white px-3 py-2.5 text-base font-normal normal-case" value={draft.methodId} onChange={(event) => setDraft((current) => ({ ...current, methodId: event.target.value }))}>{recipe.methodOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
              {config.recommendedFormulas[draft.methodId] && !formulasMatch(config.recommendedFormulas[draft.methodId], draft.formula) && <button type="button" className="justify-self-start text-sm font-bold text-[var(--yeet-tomato-strong)] underline underline-offset-4" onClick={() => { setSelectedPresetId(''); setPresetName(''); updateFormula(clone(config.recommendedFormulas[draft.methodId])) }}>Use recommended formula for {method?.label ?? 'this method'}</button>}
            </section>

            {mode === 'target' ? (
              <section className="mt-7 grid gap-4" aria-labelledby="formula-heading">
                <h3 id="formula-heading" className="text-xl font-bold">Formula</h3>
                <FlourEditor value={draft.formula.flour} onChange={(flour) => updateFormula({ flour })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Hydration" suffix="%" value={draft.formula.hydrationPercent} onChange={(hydrationPercent) => updateFormula({ hydrationPercent })} />
                  <Field label="Salt" suffix="%" value={draft.formula.saltPercent} onChange={(saltPercent) => updateFormula({ saltPercent })} />
                  {draft.formula.family === 'pizza' && <><Field label="Oil" suffix="%" value={draft.formula.oilPercent} onChange={(oilPercent) => updateFormula({ oilPercent })} /><Field label="Sugar" suffix="%" value={draft.formula.sugarPercent} onChange={(sugarPercent) => updateFormula({ sugarPercent })} /><Field label="Malt powder" suffix="%" value={draft.formula.maltPercent} onChange={(maltPercent) => updateFormula({ maltPercent })} /><Field label="Instant yeast" suffix="%" value={draft.formula.yeastPercent} onChange={(yeastPercent) => updateFormula({ yeastPercent })} /></>}
                  {draft.formula.family === 'sourdough' && <Field label="Ripe levain" suffix="% of flour" value={draft.formula.levainPercent} onChange={(levainPercent) => updateFormula({ levainPercent })} />}
                </div>
              </section>
            ) : (
              <section className="mt-7 grid gap-4" aria-labelledby="weights-heading">
                <h3 id="weights-heading" className="text-xl font-bold">Ingredient weights</h3>
                <FlourEditor value={reverseRows} unit="g" onChange={(freshFlour) => applyReverse({ freshFlour })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Added water" suffix="g" value={result.addedWaterGrams} onChange={(addedWaterGrams) => applyReverse({ addedWaterGrams })} />
                  <Field label="Salt" suffix="g" value={result.saltGrams} onChange={(saltGrams) => applyReverse({ saltGrams })} />
                  {draft.formula.family === 'pizza' && <><Field label="Oil" suffix="g" value={result.oilGrams} onChange={(oilGrams) => applyReverse({ oilGrams })} /><Field label="Sugar" suffix="g" value={result.sugarGrams} onChange={(sugarGrams) => applyReverse({ sugarGrams })} /><Field label="Malt powder" suffix="g" value={result.maltGrams} onChange={(maltGrams) => applyReverse({ maltGrams })} /><Field label="Instant yeast" suffix="g" value={result.yeastGrams} onChange={(yeastGrams) => applyReverse({ yeastGrams })} /></>}
                </div>
              </section>
            )}

            {draft.formula.family === 'sourdough' && draft.formula.starter && (
              <section className="mt-7 grid gap-4 border-t border-[var(--yeet-border)] pt-6" aria-labelledby="starter-heading">
                <div><h3 id="starter-heading" className="text-xl font-bold">Ripe starter / levain</h3><p className="mt-1 text-sm">Weight, hydration, and flour composition stay together in both calculator views.</p></div>
                {mode === 'weights' && <Field label="Ripe starter weight" suffix="g" value={result.levainGrams} onChange={(levainGrams) => applyReverse({ levainGrams })} />}
                <Field label="Starter hydration" suffix="%" value={draft.formula.starter.hydrationPercent} onChange={(hydrationPercent) => mode === 'weights' ? applyReverse({ starter: { ...draft.formula.starter!, hydrationPercent } }) : updateFormula({ starter: { ...draft.formula.starter!, hydrationPercent } })} />
                <FlourEditor value={draft.formula.starter.flour} onChange={(flour) => mode === 'weights' ? applyReverse({ starter: { ...draft.formula.starter!, flour } }) : updateFormula({ starter: { ...draft.formula.starter!, flour } })} />
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input aria-label="Starter profile name" placeholder="Starter profile name" className="border border-[var(--yeet-border)] px-3 py-2" value={starterName} onChange={(event) => setStarterName(event.target.value)} /><button type="button" className="border border-[var(--yeet-gray)] px-3 text-xs font-extrabold uppercase disabled:opacity-40" disabled={!starterName.trim() || errors.length > 0} onClick={() => saveStarterProfile()}>Save new</button></div>
                {store.starterProfiles.length > 0 && <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><select aria-label="Saved starter profiles" className="min-w-0 border border-[var(--yeet-border)] bg-white px-3 py-2" value={selectedStarterId} onChange={(event) => { const saved = store.starterProfiles.find((profile) => profile.id === event.target.value); setSelectedStarterId(event.target.value); if (saved) { updateFormula({ starter: clone(saved.profile) }); setStarterName(saved.name) } }}><option value="">Load a starter profile…</option>{store.starterProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><button type="button" className="text-xs font-bold uppercase disabled:opacity-40" disabled={!selectedStarterId || !starterName.trim() || errors.length > 0} onClick={() => saveStarterProfile(selectedStarterId)}>Replace</button><button type="button" aria-label="Delete selected starter profile" disabled={!selectedStarterId} onClick={() => { persist({ ...store, starterProfiles: store.starterProfiles.filter((item) => item.id !== selectedStarterId) }); setSelectedStarterId(''); setStarterName('') }}><Trash2 className="size-4" /></button></div>}
                <button type="button" className="justify-self-start text-sm font-bold text-[var(--yeet-tomato-strong)]" aria-expanded={buildOpen} onClick={() => setBuildOpen((value) => !value)}>{buildOpen ? 'Hide levain build' : 'Build this levain'}</button>
                {buildOpen && build && <div className="grid gap-3 bg-[var(--yeet-light-pink)] p-4"><Field label="Fresh flour per 1 part seed" suffix="parts" value={seedRatio} onChange={setSeedRatio} /><Field label="Seed hydration" suffix="%" value={seed.hydrationPercent} onChange={(hydrationPercent) => setSeed({ ...seed, hydrationPercent })} /><FlourEditor value={seed.flour} onChange={(flour) => setSeed({ ...seed, flour })} /><p className="text-sm"><strong>1:{inputValue(seedRatio)}</strong> seed-to-fresh-flour ratio</p><p className="text-sm"><strong>{formatGrams(build.seedStarterGrams)}</strong> seed starter + {build.freshFlour.map((part) => `${formatGrams(part.grams)} ${part.name}`).join(' + ')} + <strong>{formatGrams(build.addedWaterGrams)}</strong> water</p></div>}
              </section>
            )}

            <section className="mt-7 border-t border-[var(--yeet-border)] pt-6" aria-labelledby="preview-heading">
              <h3 id="preview-heading" className="text-xl font-bold">Your dough</h3>
              <p className="mt-1 text-sm">{selectionSummary(draft, method)}</p>
              <p className="mt-1 text-sm">{formatGrams(result.totalFlourGrams)} total flour · {formatGrams(result.totalWaterGrams)} total water{draft.formula.family === 'sourdough' ? ` · ${formatPercent(result.prefermentedFlourPercent)} prefermented flour` : ''}</p>
              <ul className="mt-4 grid gap-1 text-sm">{dynamicDoughItems(draft).items.map((item) => <li key={item}>{item}</li>)}</ul>
              {errors.length > 0 && <div role="alert" className="mt-4 border-l-4 border-[var(--yeet-tomato)] bg-[var(--yeet-light-pink)] p-3 text-sm"><strong>Fix these before applying:</strong><ul className="mt-1 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
            </section>

          </div>
          <footer className="shrink-0 border-t border-[var(--yeet-border)] bg-white px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-[640px]:px-[18px]">
            <div className="flex justify-end gap-2"><button type="button" className="min-h-11 border border-[var(--yeet-gray)] px-5 text-xs font-extrabold uppercase" onClick={() => onOpenChange(false)}>Cancel</button><button type="button" disabled={errors.length > 0} className="min-h-11 bg-[var(--yeet-tomato-strong)] px-5 text-xs font-extrabold uppercase text-white disabled:opacity-40" onClick={() => { onApply(clone(draft)); onOpenChange(false) }}>Apply to recipe</button></div>
          </footer>
        </DialogContent>
      </Dialog>
  )
}

function isFlourBlend(value: unknown): value is FlourComponent[] {
  return Array.isArray(value) && value.every((part) => part && typeof part === 'object' && typeof part.id === 'string' && typeof part.name === 'string' && Number.isFinite(part.percent))
}

function isStarterProfile(value: unknown): value is StarterProfile {
  return Boolean(value && typeof value === 'object' && Number.isFinite((value as StarterProfile).hydrationPercent) && isFlourBlend((value as StarterProfile).flour))
}

function isDoughFormula(value: unknown): value is DoughFormula {
  if (!value || typeof value !== 'object') return false
  const formula = value as DoughFormula
  const percentages = [formula.hydrationPercent, formula.saltPercent, formula.oilPercent, formula.sugarPercent, formula.maltPercent, formula.yeastPercent, formula.levainPercent]
  return (
    (formula.family === 'pizza' || formula.family === 'sourdough') &&
    percentages.every(Number.isFinite) &&
    isFlourBlend(formula.flour) &&
    (formula.starter === undefined || isStarterProfile(formula.starter))
  )
}

function isDoughState(value: unknown): value is DoughWorkbenchState {
  if (!value || typeof value !== 'object') return false
  const state = value as DoughWorkbenchState
  return state.version === 1 && isDoughFormula(state.formula) && Boolean(state.batch) && Number.isInteger(state.batch.count) && state.batch.count > 0 && Number.isFinite(state.batch.pieceWeightGrams) && state.batch.pieceWeightGrams > 0 && (state.batch.pieceLabel === 'loaf' || state.batch.pieceLabel === 'ball') && typeof state.methodId === 'string'
}

function isDoughConfig(value: unknown): value is DoughWorkbenchConfig {
  if (!value || typeof value !== 'object') return false
  const config = value as Partial<DoughWorkbenchConfig>
  return (
    (config.defaultInputMode === 'weights' || config.defaultInputMode === 'target') &&
    isDoughState(config.defaultSelection) &&
    Boolean(config.recommendedFormulas && typeof config.recommendedFormulas === 'object' && Object.values(config.recommendedFormulas).every(isDoughFormula))
  )
}

function decodeDoughState(value: unknown, config: DoughWorkbenchConfig, recipe: RecipeContent): DoughWorkbenchState | null {
  if (!isDoughState(value)) return null
  const state = value
  if (
    state.formula.family !== config.defaultSelection.formula.family ||
    !recipe.methodOptions.some((method) => method.id === state.methodId)
  ) return null
  return calculateFormula(state.formula, state.batch).errors.length === 0 ? state : null
}

function DoughWorkbenchDrawer(props: RecipeWorkbenchDrawerProps, family: DoughFormula['family']) {
  if (!isDoughConfig(props.config)) return null
  const state = decodeDoughState(props.state, props.config, props.recipe)
  if (!state || state.formula.family !== family) return null
  return <DoughFormulaWorkbench {...props} config={props.config} selection={state} onApply={(next) => props.onApply(next)} />
}

function createDoughWorkbenchPlugin(id: string, family: DoughFormula['family']): RecipeWorkbenchPlugin {
  return {
    id,
    defaultState: (config) => isDoughConfig(config) && config.defaultSelection.formula.family === family ? clone(config.defaultSelection) : null,
    decodeState: (value, config, recipe) => {
      const state = isDoughConfig(config) ? decodeDoughState(value, config, recipe) : null
      return state?.formula.family === family ? state : null
    },
    resolveRecipe: (recipe, config, state) => {
      if (!isDoughConfig(config)) return recipe
      const decoded = decodeDoughState(state, config, recipe)
      return decoded?.formula.family === family ? resolveWorkbenchRecipe(recipe, decoded, config) : recipe
    },
    summary: (recipe, config, state) => {
      const decoded = isDoughConfig(config) ? decodeDoughState(state, config, recipe) : null
      return decoded?.formula.family === family ? selectionSummary(decoded, selectedRecipeMethod(recipe, decoded.methodId), formatAppliedGrams) : ''
    },
    Drawer: (props) => DoughWorkbenchDrawer(props, family),
  }
}

export const createSourdoughWorkbenchPlugin = () => createDoughWorkbenchPlugin('sourdough', 'sourdough')
export const createPizzaWorkbenchPlugin = () => createDoughWorkbenchPlugin('pizza', 'pizza')
