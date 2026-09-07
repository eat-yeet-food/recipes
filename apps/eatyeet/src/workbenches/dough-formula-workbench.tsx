import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { NumberField, formatNumberFieldValue, type NumberFieldPrecision, type NumberFieldValidation } from '@eat-yeet/l5-ui-primitives/primitives/number-field'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { Select } from '@eat-yeet/l5-ui-primitives/primitives/select'
import { ChoiceGroup } from '@eat-yeet/l5-ui-primitives/primitives/choice-group'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import {
  calculateFormula,
  calculateLevainBuild,
  formatPercent,
  reverseFormula,
  type DoughBatch,
  type DoughFormula,
  type FlourComponent,
  type StarterProfile,
  type ReverseFormulaInput,
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
const pieceCountLabel = (count: number, label: 'loaf' | 'ball') => label === 'loaf' ? (count === 1 ? 'loaf' : 'loaves') : (count === 1 ? 'ball' : 'balls')
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const gramPrecision = (value: number): NumberFieldPrecision => Math.abs(value) < 1 ? 3 : Math.abs(value) < 10 ? 2 : 1
const formatWorkbenchGrams = (value: number) => Number.isFinite(value) ? `${formatNumberFieldValue(value, gramPrecision(value))}g` : '—'
const formatBatchGrams = (value: number) => Number.isFinite(value) ? `${formatNumberFieldValue(value, 0)}g` : '—'
const formatAppliedGrams = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  return `${value < 20 ? value.toFixed(1) : Math.round(value)}g`
}
const formulasMatch = (left: DoughFormula, right: DoughFormula) => JSON.stringify(left) === JSON.stringify(right)
const cleanPresetName = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ')
const presetNameKey = (name: string) => cleanPresetName(name).toLowerCase()

function presetSummary(formula: DoughFormula) {
  const parts = [`${formatPercent(formula.hydrationPercent)} hydration`, `${formatPercent(formula.saltPercent)} salt`]
  if (formula.family === 'pizza') {
    if (formula.oilPercent > 0) parts.push(`${formatPercent(formula.oilPercent)} oil`)
    if (formula.yeastPercent > 0) parts.push(`${formatNumberFieldValue(formula.yeastPercent, 3)}% yeast`)
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

export function selectionSummary(selection: DoughWorkbenchState, method?: RecipeContentMethod | null, formatWeight = formatBatchGrams) {
  const { batch, formula } = selection
  const pieces = `${batch.count} ${pieceCountLabel(batch.count, batch.pieceLabel)} × ${formatWeight(batch.pieceWeightGrams)}`
  return [pieces, method?.label, `${formatPercent(formula.hydrationPercent)} hydration`].filter(Boolean).join(' · ')
}

function dynamicDoughItems(selection: DoughWorkbenchState, formatWeight = formatWorkbenchGrams) {
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

const NumericFields = createContext<{ report: NumberFieldValidation; resetKey: number } | null>(null)

function Field({ label, value, onChange, suffix, step, min = 0, positive = false, hideLabel = false, decimalPlaces }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: string; min?: number; positive?: boolean; hideLabel?: boolean; decimalPlaces?: NumberFieldPrecision }) {
  const fields = useContext(NumericFields)
  const precision = decimalPlaces ?? (suffix === 'g' ? gramPrecision(value) : 2)
  return <NumberField decimalPlaces={precision} label={label} value={value} onValueChange={onChange} suffix={suffix} min={min} integer={step === '1'} positive={positive} hideLabel={hideLabel} onValidationChange={fields?.report} resetKey={fields?.resetKey} />
}

function FlourEditor({ value, onChange, unit = '%' }: { value: FlourComponent[]; onChange: (value: FlourComponent[]) => void; unit?: '%' | 'g' }) {
  return (
    <div className="grid gap-2">
      {value.map((part, index) => (
        <div key={part.id} className="grid grid-cols-[minmax(0,1fr)_100px_44px] items-start gap-2">
          <Input aria-label={`Flour ${index + 1} name`} className="px-3" value={part.name} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
          <Field hideLabel label={`${part.name || `Flour ${index + 1}`} ${unit === '%' ? 'percentage' : 'grams'}`} suffix={unit} value={part.percent} onChange={(percent) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, percent } : item))} />
          <Button variant="ghost" size="icon" type="button" disabled={value.length === 1} aria-label={`Remove ${part.name || 'flour'}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="mx-auto size-4" /></Button>
        </div>
      ))}
      <Button variant="link" type="button" className="gap-1" onClick={() => onChange([...value, { id: `flour-${crypto.randomUUID()}`, name: '', percent: 0 }])}><Plus className="size-4" /> Add flour</Button>
    </div>
  )
}

function Segmented({ value, onChange }: { value: InputMode; onChange: (value: InputMode) => void }) {
  return <ChoiceGroup label="Calculator input mode" value={value} onChange={onChange} options={[{ value: 'weights', label: 'Weights' }, { value: 'target', label: 'Target batch' }]} />
}

function starterFrom(formula: DoughFormula): StarterProfile {
  return clone(formula.starter ?? { hydrationPercent: 77, flour: formula.flour })
}

function WorkbenchPanel({ headingId, title, summary, children }: { headingId: string; title: string; summary?: ReactNode; children: ReactNode }) {
  return <section className="mt-7 rounded-field bg-ink p-5 text-action-label" aria-labelledby={headingId}>
    <div className="flex items-baseline justify-between gap-3">
      <h3 id={headingId} className="text-2xl font-bold text-brand">{title}</h3>
      {summary}
    </div>
    {children}
  </section>
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
  const [weightDraft, setWeightDraft] = useState<ReverseFormulaInput | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [fieldResetKey, setFieldResetKey] = useState(0)
  const reportFieldError = useCallback<NumberFieldValidation>((id, error) => {
    setFieldErrors((current) => {
      if ((current[id] ?? null) === error) return current
      const next = { ...current }
      if (error) next[id] = error
      else delete next[id]
      return next
    })
  }, [])
  const numericFields = useMemo(() => ({ report: reportFieldError, resetKey: fieldResetKey }), [reportFieldError, fieldResetKey])
  const [mode, setMode] = useState<InputMode>(config.defaultInputMode)
  const [store, setStore] = useState<WorkbenchStore>(EMPTY_STORE)
  const [storeError, setStoreError] = useState('')
  const [presetName, setPresetName] = useState('')
  const [chosenPresetId, setChosenPresetId] = useState('')
  const [presetAttempted, setPresetAttempted] = useState(false)
  const [presetNotice, setPresetNotice] = useState('')
  const presetNameInput = useRef<HTMLInputElement>(null)
  const presetPicker = useRef<HTMLSelectElement>(null)
  const [starterName, setStarterName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [selectedStarterId, setSelectedStarterId] = useState('')
  const [buildOpen, setBuildOpen] = useState(false)
  const [seedRatio, setSeedRatio] = useState(2)
  const [seed, setSeed] = useState(() => starterFrom(selection.formula))
  const storageKey = `${storageScope}:recipe-workbench:v1`
  const result = useMemo(() => calculateFormula(draft.formula, draft.batch), [draft])
  const weightInputs: ReverseFormulaInput = weightDraft ?? {
    family: draft.formula.family,
    freshFlour: result.freshFlour,
    addedWaterGrams: result.addedWaterGrams,
    saltGrams: result.saltGrams,
    oilGrams: result.oilGrams,
    sugarGrams: result.sugarGrams,
    maltGrams: result.maltGrams,
    yeastGrams: result.yeastGrams,
    levainGrams: result.levainGrams,
    starter: draft.formula.starter,
  }
  const editableStarter = mode === 'weights' ? weightInputs.starter : draft.formula.starter
  const reverseRows = weightInputs.freshFlour.map((part) => ({ ...part, percent: part.grams }))
  const reverseErrors = weightDraft ? reverseFormula(weightDraft).errors : []
  const method = selectedRecipeMethod(recipe, draft.methodId)
  const build = draft.formula.starter && result.levainGrams > 0 ? calculateLevainBuild(result.levainGrams, draft.formula.starter, seed, seedRatio) : null
  const errors = [...new Set([...Object.values(fieldErrors), ...reverseErrors, ...result.errors, ...(buildOpen && build ? build.errors : [])])]
  const compatiblePresets = store.presets.filter((preset) => preset.formula.family === draft.formula.family)
  const activePresetId = compatiblePresets.find((preset) => preset.id === selectedPresetId && formulasMatch(preset.formula, draft.formula))?.id ?? ''
  const selectedPreset = compatiblePresets.find((preset) => preset.id === selectedPresetId)
  const chosenPreset = compatiblePresets.find((preset) => preset.id === chosenPresetId) ?? selectedPreset ?? compatiblePresets[0]
  const normalizedPresetName = cleanPresetName(presetName)
  const presetNameError = !normalizedPresetName
    ? 'Enter a name for this formula.'
    : normalizedPresetName.length > 80
      ? 'Use 80 characters or fewer.'
      : compatiblePresets.some((preset) => preset.id !== selectedPresetId && presetNameKey(preset.name) === presetNameKey(normalizedPresetName))
        ? 'A formula with this name already exists. Choose a different name or load it to update it.'
        : ''
  const duplicateFormula = compatiblePresets.find((preset) => preset.id !== selectedPresetId && formulasMatch(preset.formula, draft.formula))
  const presetFormulaError = errors.length
    ? `Fix these values before saving: ${errors[0]}`
    : duplicateFormula
      ? `This formula is already saved as “${duplicateFormula.name}”. Load it to update it, or change the formula before saving a new one.`
      : ''
  const showPresetNameError = Boolean(presetNameError) && (presetAttempted || presetName.length > 0)
  const presetNameDescription = showPresetNameError ? 'formula-preset-name-error' : !normalizedPresetName ? 'formula-preset-name-hint' : undefined

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
    setWeightDraft(null)
    setFieldResetKey((current) => current + 1)
    setSeed(starterFrom(selection.formula))
    document.body.dataset.workbenchOpen = 'true'
    return () => { delete document.body.dataset.workbenchOpen }
  }, [open, selection])

  const persist = (next: WorkbenchStore) => {
    const error = saveStore(storageKey, next)
    setStoreError(error)
    if (error) return false
    setStore(next)
    return true
  }
  const changeMode = (next: InputMode) => {
    setMode(next)
    setWeightDraft(null)
    persist({ ...store, modes: { ...store.modes, [recipe.slug]: next } })
  }
  const updateBatch = (changes: Partial<DoughBatch>) => {
    setWeightDraft(null)
    setDraft((current) => ({ ...current, batch: { ...current.batch, ...changes } }))
  }
  const updateFormula = (changes: Partial<DoughFormula>) => {
    setWeightDraft(null)
    setDraft((current) => ({ ...current, formula: { ...current.formula, ...changes } }))
  }
  const applyReverse = (changes: Partial<{ freshFlour: FlourComponent[]; addedWaterGrams: number; saltGrams: number; oilGrams: number; sugarGrams: number; maltGrams: number; yeastGrams: number; levainGrams: number; starter: StarterProfile }>) => {
    const current = weightInputs
    const nextRows = changes.freshFlour ?? current.freshFlour.map((part) => ({ ...part, percent: part.grams }))
    const next: ReverseFormulaInput = {
      family: draft.formula.family,
      freshFlour: nextRows.map((part) => ({ id: part.id, name: part.name, grams: part.percent })),
      addedWaterGrams: changes.addedWaterGrams ?? current.addedWaterGrams,
      saltGrams: changes.saltGrams ?? current.saltGrams,
      oilGrams: changes.oilGrams ?? current.oilGrams,
      sugarGrams: changes.sugarGrams ?? current.sugarGrams,
      maltGrams: changes.maltGrams ?? current.maltGrams,
      yeastGrams: changes.yeastGrams ?? current.yeastGrams,
      levainGrams: changes.levainGrams ?? current.levainGrams,
      starter: draft.formula.family === 'sourdough' ? changes.starter ?? current.starter ?? starterFrom(draft.formula) : undefined,
    }
    setWeightDraft(next)
    const reversed = reverseFormula(next)
    if (reversed.errors.length) return
    setDraft((currentDraft) => ({ ...currentDraft, formula: reversed.formula, batch: { ...currentDraft.batch, pieceWeightGrams: reversed.totalDoughGrams / currentDraft.batch.count } }))
  }
  const savePreset = () => {
    setPresetAttempted(true)
    setPresetNotice('')
    if (presetNameError || presetFormulaError) {
      if (presetNameError) presetNameInput.current?.focus()
      return
    }
    const item = { id: selectedPreset?.id ?? crypto.randomUUID(), name: normalizedPresetName, formula: clone(draft.formula) }
    if (!persist({ ...store, presets: selectedPreset ? store.presets.map((preset) => preset.id === selectedPreset.id ? item : preset) : [...store.presets, item] })) return
    setSelectedPresetId(item.id)
    setChosenPresetId(item.id)
    setPresetName(item.name)
    setPresetAttempted(false)
    setPresetNotice(selectedPreset ? 'Formula updated.' : 'Formula saved.')
  }
  const deletePreset = (preset: FormulaPreset) => {
    if (!persist({ ...store, presets: store.presets.filter((item) => item.id !== preset.id), defaults: Object.fromEntries(Object.entries(store.defaults).filter(([, id]) => id !== preset.id)) })) return
    if (selectedPresetId === preset.id) {
      setSelectedPresetId('')
      setPresetName('')
      setPresetAttempted(false)
    }
    setChosenPresetId('')
    setPresetNotice(`Deleted “${preset.name}”.`)
    if (compatiblePresets.length > 1) presetPicker.current?.focus()
    else presetNameInput.current?.focus()
  }
  const saveStarterProfile = (replaceId?: string) => {
    const name = starterName.trim()
    const profile = draft.formula.starter
    if (!name || !profile || errors.length) return
    const item = { id: replaceId ?? `${Date.now()}`, name, profile: clone(profile) }
    if (!persist({ ...store, starterProfiles: replaceId ? store.starterProfiles.map((saved) => saved.id === replaceId ? item : saved) : [...store.starterProfiles, item] })) return
    setSelectedStarterId(item.id)
    setStarterName(item.name)
  }

  return (
      <NumericFields.Provider value={numericFields}>
      <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setDraft(clone(selection)) }}>
        <DialogContent variant="sheet" overlayClassName="z-[var(--z-workbench)]" data-workbench-drawer="" aria-describedby={errors.length ? "workbench-description workbench-errors" : "workbench-description"} className="top-0 right-0 bottom-0 left-auto z-[var(--z-workbench)] flex h-[100dvh] w-full !max-w-[600px] translate-x-0 translate-y-0 flex-col gap-0 overflow-x-hidden rounded-none border-0 bg-brand p-0 text-[var(--color-ink)] shadow-none ring-0 max-[640px]:!w-full max-[640px]:!max-w-none data-open:zoom-in-100 data-closed:zoom-out-100 data-open:slide-in-from-right data-closed:slide-out-to-right motion-reduce:transition-none">
          <header className="shrink-0 px-6 py-5 pr-14 max-[640px]:px-[18px]">
            <DialogTitle className="font-hero text-[30px] leading-tight font-normal">Adjust recipe</DialogTitle>
            <DialogDescription id="workbench-description" className="mt-2 text-sm text-[var(--color-ink)]">Build the batch you want, preview the weights, then apply it to the whole recipe.</DialogDescription>
          </header>
          <div data-workbench-scroll-region="" className="min-h-0 min-w-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-5 max-[640px]:px-[18px]">
            <Segmented value={mode} onChange={changeMode} />

            <WorkbenchPanel headingId="presets-heading" title="Saved formulas" summary={<span className="text-xs text-action-label">{compatiblePresets.length} saved</span>}>
              <div className="mt-3 grid gap-3">
              <p className="text-xs leading-relaxed text-action-label">Save your formula here. Batch size and oven stay with this recipe.</p>
              {chosenPreset ? (
                <div className="grid gap-2">
                  <label htmlFor="saved-formula-picker" className="text-xs font-semibold">Load a saved formula</label>
                  <div className="flex items-start gap-2">
                    <Select ref={presetPicker} surface="on-ink" id="saved-formula-picker" className="min-w-0 flex-1" value={chosenPreset.id} onChange={(event) => setChosenPresetId(event.target.value)}>
                      {compatiblePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}{store.defaults[recipe.slug] === preset.id ? ' (default)' : ''}</option>)}
                    </Select>
                    <Button variant="on-ink" type="button" size="sm" aria-label={`Load ${chosenPreset.name}`} onClick={() => {
                      setDraft((current) => ({ ...current, formula: clone(chosenPreset.formula) }))
                      setWeightDraft(null)
                      setFieldResetKey((current) => current + 1)
                      setSelectedPresetId(chosenPreset.id)
                      setPresetName(chosenPreset.name)
                      setPresetAttempted(false)
                      setPresetNotice('Formula loaded. Apply to recipe when ready.')
                    }}>Load</Button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-xs leading-relaxed text-action-label">{presetSummary(chosenPreset.formula)}</p>
                    <Button variant="quiet-on-ink" type="button" size="sm" aria-label={`Delete ${chosenPreset.name}`} onClick={() => deletePreset(chosenPreset)}><Trash2 className="size-4" aria-hidden="true" />Delete</Button>
                  </div>
                </div>
              ) : <p className="text-sm text-action-label">No saved formulas yet.</p>}

              <form noValidate className="grid gap-3 border-t border-border-on-ink pt-4" onSubmit={(event) => { event.preventDefault(); savePreset() }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="min-w-0 flex-1 break-words text-sm font-semibold">{selectedPreset ? `Editing ${selectedPreset.name}` : 'Save current formula'}</h4>
                  {selectedPreset && <span className="text-xs text-action-label">{activePresetId ? 'Loaded' : 'Modified'}</span>}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="formula-preset-name" className="text-xs font-semibold">Formula name</label>
                  <Input surface="on-ink" ref={presetNameInput} id="formula-preset-name" aria-label="Formula preset name" required aria-invalid={showPresetNameError} aria-describedby={presetNameDescription} placeholder="e.g. Weekend pizza" value={presetName} onBlur={() => setPresetAttempted(true)} onChange={(event) => { setPresetName(event.target.value); setPresetNotice('') }} />
                  {showPresetNameError && <p id="formula-preset-name-error" role="alert" className="rounded-field bg-danger-soft p-3 text-xs text-danger">{presetNameError}</p>}
                  {!showPresetNameError && !normalizedPresetName && <p id="formula-preset-name-hint" className="text-xs text-action-label">Enter a name to save this formula.</p>}
                </div>
                {!presetNameError && presetFormulaError && <p id="formula-preset-error" role="alert" className="break-words rounded-field bg-danger-soft p-3 text-xs text-danger">{presetFormulaError}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="on-ink" type="submit" size="sm" disabled={Boolean(presetNameError || presetFormulaError)} aria-describedby={presetNameError ? presetNameDescription : presetFormulaError ? 'formula-preset-error' : undefined}>{selectedPreset ? 'Update formula' : 'Save new'}</Button>
                  {selectedPreset && <Button variant="quiet-on-ink" type="button" size="sm" onClick={() => {
                    setSelectedPresetId('')
                    setPresetName('')
                    setPresetAttempted(false)
                    setPresetNotice('')
                    presetNameInput.current?.focus()
                  }}>New formula</Button>}
                </div>
              </form>
              {selectedPreset && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-on-ink pt-3">
                  <Button variant="quiet-on-ink" type="button" size="sm" disabled={store.defaults[recipe.slug] === selectedPreset.id} onClick={() => {
                    if (persist({ ...store, defaults: { ...store.defaults, [recipe.slug]: selectedPreset.id } })) setPresetNotice('Default formula updated.')
                  }}>{store.defaults[recipe.slug] === selectedPreset.id ? 'Default for this recipe' : 'Make default'}</Button>
                </div>
              )}
              <p role="status" className="text-xs text-action-label empty:hidden">{storeError || presetNotice}</p>
              </div>
            </WorkbenchPanel>

            <section className="mt-6 grid gap-4" aria-labelledby="batch-heading">
              <h3 id="batch-heading" className="text-xl font-bold">Batch</h3>
              <div className="grid grid-cols-2 gap-3 max-[380px]:grid-cols-1">
                <Field label={pieceCountLabel(2, draft.batch.pieceLabel)} value={draft.batch.count} min={1} step="1" onChange={(count) => updateBatch({ count })} />
                <Field label={`${draft.batch.pieceLabel} weight`} suffix="g" positive decimalPlaces={0} value={draft.batch.pieceWeightGrams} onChange={(pieceWeightGrams) => updateBatch({ pieceWeightGrams })} />
              </div>
              <Field label="Total dough weight" suffix="g" positive decimalPlaces={0} value={draft.batch.count * draft.batch.pieceWeightGrams} onChange={(total) => updateBatch({ pieceWeightGrams: total / draft.batch.count })} />
              {recipe.methodOptions.length > 1 && <label className="grid gap-1 text-xs font-bold">Oven method<Select className="font-normal" value={draft.methodId} onChange={(event) => setDraft((current) => ({ ...current, methodId: event.target.value }))}>{recipe.methodOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select></label>}
              {config.recommendedFormulas[draft.methodId] && !formulasMatch(config.recommendedFormulas[draft.methodId], draft.formula) && <Button variant="link" type="button" className="justify-self-start" onClick={() => { setSelectedPresetId(''); setPresetName(''); setPresetAttempted(false); setPresetNotice(''); setFieldResetKey((current) => current + 1); updateFormula(clone(config.recommendedFormulas[draft.methodId])) }}>Use recommended formula for {method?.label ?? 'this method'}</Button>}
            </section>

            {mode === 'target' ? (
              <section key="target" className="mt-7 grid gap-4" aria-labelledby="formula-heading">
                <h3 id="formula-heading" className="text-xl font-bold">Formula</h3>
                <FlourEditor value={draft.formula.flour} onChange={(flour) => updateFormula({ flour })} />
                <div className="grid grid-cols-2 gap-3 max-[380px]:grid-cols-1">
                  <Field label="Hydration" suffix="%" value={draft.formula.hydrationPercent} onChange={(hydrationPercent) => updateFormula({ hydrationPercent })} />
                  <Field label="Salt" suffix="%" value={draft.formula.saltPercent} onChange={(saltPercent) => updateFormula({ saltPercent })} />
                  {draft.formula.family === 'pizza' && <><Field label="Oil" suffix="%" value={draft.formula.oilPercent} onChange={(oilPercent) => updateFormula({ oilPercent })} /><Field label="Sugar" suffix="%" value={draft.formula.sugarPercent} onChange={(sugarPercent) => updateFormula({ sugarPercent })} /><Field label="Malt powder" suffix="%" value={draft.formula.maltPercent} onChange={(maltPercent) => updateFormula({ maltPercent })} /><Field label="Instant yeast" suffix="%" decimalPlaces={3} value={draft.formula.yeastPercent} onChange={(yeastPercent) => updateFormula({ yeastPercent })} /></>}
                  {draft.formula.family === 'sourdough' && <Field label="Ripe levain" suffix="% of flour" value={draft.formula.levainPercent} onChange={(levainPercent) => updateFormula({ levainPercent })} />}
                </div>
              </section>
            ) : (
              <section key="weights" className="mt-7 grid gap-4" aria-labelledby="weights-heading">
                <h3 id="weights-heading" className="text-xl font-bold">Ingredient weights</h3>
                <FlourEditor value={reverseRows} unit="g" onChange={(freshFlour) => applyReverse({ freshFlour })} />
                <div className="grid grid-cols-2 gap-3 max-[380px]:grid-cols-1">
                  <Field label="Added water" suffix="g" value={weightInputs.addedWaterGrams ?? 0} onChange={(addedWaterGrams) => applyReverse({ addedWaterGrams })} />
                  <Field label="Salt" suffix="g" value={weightInputs.saltGrams ?? 0} onChange={(saltGrams) => applyReverse({ saltGrams })} />
                  {draft.formula.family === 'pizza' && <><Field label="Oil" suffix="g" value={weightInputs.oilGrams ?? 0} onChange={(oilGrams) => applyReverse({ oilGrams })} /><Field label="Sugar" suffix="g" value={weightInputs.sugarGrams ?? 0} onChange={(sugarGrams) => applyReverse({ sugarGrams })} /><Field label="Malt powder" suffix="g" value={weightInputs.maltGrams ?? 0} onChange={(maltGrams) => applyReverse({ maltGrams })} /><Field label="Instant yeast" suffix="g" value={weightInputs.yeastGrams ?? 0} onChange={(yeastGrams) => applyReverse({ yeastGrams })} /></>}
                </div>
              </section>
            )}

            {draft.formula.family === 'sourdough' && editableStarter && (
              <section className="mt-7 grid gap-4 border-t border-border-on-brand pt-6" aria-labelledby="starter-heading">
                <div><h3 id="starter-heading" className="text-xl font-bold">Ripe starter / levain</h3><p className="mt-1 text-sm">Weight, hydration, and flour composition stay together in both calculator views.</p></div>
                {mode === 'weights' && <Field label="Ripe starter weight" suffix="g" value={weightInputs.levainGrams ?? 0} onChange={(levainGrams) => applyReverse({ levainGrams })} />}
                <Field label="Starter hydration" positive suffix="%" value={editableStarter.hydrationPercent} onChange={(hydrationPercent) => mode === 'weights' ? applyReverse({ starter: { ...editableStarter!, hydrationPercent } }) : updateFormula({ starter: { ...editableStarter!, hydrationPercent } })} />
                <FlourEditor value={editableStarter.flour} onChange={(flour) => mode === 'weights' ? applyReverse({ starter: { ...editableStarter!, flour } }) : updateFormula({ starter: { ...editableStarter!, flour } })} />
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input aria-label="Starter profile name" placeholder="Starter profile name" className="px-3" value={starterName} onChange={(event) => setStarterName(event.target.value)} /><Button variant="secondary" type="button" size="sm" disabled={!starterName.trim() || errors.length > 0} onClick={() => saveStarterProfile()}>Save new</Button></div>
                {store.starterProfiles.length > 0 && <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><Select aria-label="Saved starter profiles" className="min-w-0" value={selectedStarterId} onChange={(event) => { const saved = store.starterProfiles.find((profile) => profile.id === event.target.value); setSelectedStarterId(event.target.value); if (saved) { setFieldResetKey((current) => current + 1); updateFormula({ starter: clone(saved.profile) }); setStarterName(saved.name) } }}><option value="">Load a starter profile…</option>{store.starterProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</Select><Button variant="link" type="button" className="text-xs font-bold disabled:opacity-40" disabled={!selectedStarterId || !starterName.trim() || errors.length > 0} onClick={() => saveStarterProfile(selectedStarterId)}>Replace</Button><Button variant="ghost" size="icon" type="button" aria-label="Delete selected starter profile" disabled={!selectedStarterId} onClick={() => { persist({ ...store, starterProfiles: store.starterProfiles.filter((item) => item.id !== selectedStarterId) }); setSelectedStarterId(''); setStarterName('') }}><Trash2 className="size-4" /></Button></div>}
                <Button variant="link" type="button" className="justify-self-start" aria-expanded={buildOpen} onClick={() => setBuildOpen((value) => !value)}>{buildOpen ? 'Hide levain build' : 'Build this levain'}</Button>
                {buildOpen && build && <div className="grid gap-3 rounded-field bg-tint p-4"><Field label="Fresh flour per 1 part seed" positive suffix="parts" value={seedRatio} onChange={setSeedRatio} /><Field label="Seed hydration" suffix="%" value={seed.hydrationPercent} onChange={(hydrationPercent) => setSeed({ ...seed, hydrationPercent })} /><FlourEditor value={seed.flour} onChange={(flour) => setSeed({ ...seed, flour })} /><p className="text-sm"><strong>1:{formatNumberFieldValue(seedRatio, 2)}</strong> seed-to-fresh-flour ratio</p><p className="text-sm"><strong>{formatWorkbenchGrams(build.seedStarterGrams)}</strong> seed starter + {build.freshFlour.map((part) => `${formatWorkbenchGrams(part.grams)} ${part.name}`).join(' + ')} + <strong>{formatWorkbenchGrams(build.addedWaterGrams)}</strong> water</p></div>}
              </section>
            )}

            <WorkbenchPanel headingId="preview-heading" title="Your dough">
              {(Object.keys(fieldErrors).length > 0 || reverseErrors.length > 0) && <p className="mt-2 text-xs text-action-label">Finish the incomplete fields before saving or applying. This preview uses the last valid numbers.</p>}
              <p className="mt-2 text-sm leading-relaxed">{selectionSummary(draft, method)}</p>
              <dl className="my-5 grid grid-cols-2 gap-4">
                <div><dt className="text-xs">Total flour</dt><dd className="mt-1 text-xl font-bold tabular-nums text-brand">{formatWorkbenchGrams(result.totalFlourGrams)}</dd></div>
                <div><dt className="text-xs">Total water</dt><dd className="mt-1 text-xl font-bold tabular-nums text-brand">{formatWorkbenchGrams(result.totalWaterGrams)}</dd></div>
              </dl>
              {draft.formula.family === 'sourdough' && <p className="mb-4 text-xs">{formatPercent(result.prefermentedFlourPercent)} prefermented flour</p>}
              <dl className="grid gap-3 text-sm">{dynamicDoughItems(draft).items.map((item) => {
                const [amount, ...name] = item.split(' ')
                return <div key={item} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4"><dt>{name.join(' ')}</dt><dd className="m-0 font-bold tabular-nums">{amount}</dd></div>
              })}</dl>
              {errors.length > 0 && <div id="workbench-errors" role="alert" className="mt-4 rounded-field bg-danger-soft p-4 text-sm text-danger"><strong>Fix these before applying:</strong><ul className="mt-1 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
            </WorkbenchPanel>

          </div>
          <footer className="shrink-0 bg-brand px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-[640px]:px-[18px]">
            <div className="flex items-center justify-end gap-4"><Button variant="link" type="button" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="default" type="button" disabled={errors.length > 0} onClick={() => { if (errors.length) return; onApply(clone(draft)); onOpenChange(false) }}>Apply to recipe</Button></div>
          </footer>
        </DialogContent>
      </Dialog>
      </NumericFields.Provider>
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
