'use client'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { pizzaBallWeight } from '@eat-yeet/l2-recipe-domain/pizza-sizing'
import { BULK_TEMPERATURE_RANGE_F, SMALLER_LOAF_BELOW_F, bannetonPieceWeight, estimateBulkMinutes, foldGroups, foldsFromGroups, levainToFridgeMinutes, parseDuration, targetRisePercent, type FoldGroup, type FoldPlan, type SourdoughFoldMethod, type SourdoughProcess } from '@eat-yeet/l2-recipe-domain/sourdough-process'
import { MAX_LEVAIN_EXTRA_PERCENT, calculateDoughLevainBuild, calculateFormula, formatPercent, levainExtraPercent, reverseFormula, type DoughBatch, type DoughFormula, type FlourComponent, type ReverseFormulaInput, type StarterProfile } from '@eat-yeet/l2-recipe-domain/formula'
import { selectedRecipeMethod, type RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { ChoiceGroup } from '@eat-yeet/l5-ui-primitives/primitives/choice-group'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { NumberField, formatNumberFieldValue, type NumberFieldPrecision, type NumberFieldValidation } from '@eat-yeet/l5-ui-primitives/primitives/number-field'
import { Select } from '@eat-yeet/l5-ui-primitives/primitives/select'
import { Switch } from '@eat-yeet/l5-ui-primitives/primitives/switch'
import { clone, formatWorkbenchGrams, pieceCountLabel, starterFrom, yeastGramPrecision, type DoughWorkbenchConfig, type DoughWorkbenchState, type InputMode } from './dough-workbench-model'
import { formulasMatch } from './dough-formula-match'
import { levainYield } from './dough-kitchen-model'
import { formatDuration } from './sourdough-process'
import { COLD_DAYS, FOOD_PROCESSOR_MAX_BALLS, HAND_REST_MINUTES, PIZZA_TEMPERATURE_RANGE_F, warmUpForColdDays, type PizzaMixingMethod, type PizzaProcess } from '@eat-yeet/l2-recipe-domain/pizza-process'
import { Eyebrow } from '@eat-yeet/l5-ui-primitives/primitives/typography'

const NumericFields = createContext<{ report: NumberFieldValidation; resetKey: number } | null>(null)

function Field({ label, value, onChange, suffix, step, min = 0, max, positive = false, hideLabel = false, decimalPlaces }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: string; min?: number; max?: number; positive?: boolean; hideLabel?: boolean; decimalPlaces?: NumberFieldPrecision }) {
  const fields = useContext(NumericFields)
  const precision = decimalPlaces ?? (suffix === 'g' && Math.abs(value) >= 20 ? 0 : 1)
  return <NumberField surface="underline" decimalPlaces={precision} label={label} value={value} onValueChange={onChange} suffix={suffix} min={min} max={max} integer={step === '1'} positive={positive} hideLabel={hideLabel} onValidationChange={fields?.report} resetKey={fields?.resetKey} />
}

const DURATION_HINT = 'Use minutes (45) or hours:minutes (1:30).'

/** One text field for a whole-minute duration: accepts 90, 1:30, 1h30 or 45m and shows 1:30h after editing. */
function DurationField({ label, value, onChange, min = 0, hideLabel = false, describedBy }: { label: string; value: number; onChange: (minutes: number) => void; min?: number; hideLabel?: boolean; describedBy?: string }) {
  const fields = useContext(NumericFields)
  const id = useId()
  const resetKey = fields?.resetKey ?? 0
  const report = fields?.report
  const [edit, setEdit] = useState<{ text: string; revision: number } | null>(null)
  const [focused, setFocused] = useState(false)
  const editing = edit?.revision === resetKey ? edit : null
  const parsed = editing ? parseDuration(editing.text) : value
  const error = parsed === null ? DURATION_HINT : parsed < min ? `Enter ${formatDuration(min)} or more.` : null
  const showError = Boolean(error) && !focused
  useEffect(() => { report?.(id, error ? `${label}: ${error}` : null) }, [error, id, label, report])
  useEffect(() => () => report?.(id, null), [id, report])
  return <div className="grid min-w-0 content-start gap-1">
    <label htmlFor={id} className={hideLabel ? 'sr-only' : 'font-action text-sm font-bold text-ink'}>{label}</label>
    <Input surface="underline" id={id} type="text" inputMode="text" enterKeyHint="done" autoComplete="off" spellCheck={false}
      value={editing ? editing.text : formatDuration(value)} aria-invalid={showError}
      aria-describedby={[describedBy, showError ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const text = event.target.value
        setEdit({ text, revision: resetKey })
        const minutes = parseDuration(text)
        if (minutes !== null && minutes >= min) onChange(minutes)
      }}
      onBlur={() => { setFocused(false); if (!error) setEdit(null) }}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} />
    {showError && <p id={`${id}-error`} className="text-xs text-danger">{error}</p>}
  </div>
}

/** One row per flour. Accessible names carry the blend (`prefix`) so starter rows never share a name with dough rows. */
function FlourEditor({ label, prefix = '', value, onChange, unit = '%' }: { label: string; prefix?: string; value: FlourComponent[]; onChange: (value: FlourComponent[]) => void; unit?: '%' | 'g' }) {
  const id = useId()
  const row = 'grid grid-cols-[minmax(0,1fr)_120px_44px] items-end gap-4 max-[420px]:grid-cols-[minmax(0,1fr)_92px_44px] max-[420px]:gap-3'
  return <div className="grid gap-3" role="group" aria-label={label}>
    <div aria-hidden="true" className={`${row} -mb-2 font-action text-sm font-bold`}><span>{prefix ? `${prefix} flour` : 'Flour'}</span><span>{unit === '%' ? 'Share' : 'Weight'}</span></div>
    {value.map((part, index) => <div key={part.id} className={row}>
      <Input surface="underline" id={`${id}-${part.id}`} aria-label={`${prefix ? `${prefix} flour` : 'Flour'} ${index + 1} name`} value={part.name} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
      <Field hideLabel label={`${prefix ? `${prefix} ` : ''}${part.name || `Flour ${index + 1}`} ${unit === '%' ? 'percentage' : 'grams'}`} suffix={unit} value={part.percent} onChange={(percent) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, percent } : item))} />
      <Button variant="danger" size="icon" type="button" disabled={value.length === 1} aria-label={`Remove ${prefix ? `${prefix.toLowerCase()} ` : ''}${part.name || 'flour'}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="mx-auto size-4" /></Button>
    </div>)}
    <Button variant="link" type="button" className="justify-self-start gap-1" onClick={() => onChange([...value, { id: `flour-${crypto.randomUUID()}`, name: '', percent: 0 }])}><Plus className="size-4" />Add {prefix ? `${prefix.toLowerCase()} ` : ''}flour</Button>
  </div>
}

const GUIDELINES_URL = 'https://thesourdoughjourney.com/the-mystery-of-percentage-rise-in-bulk-fermentation/'

/**
 * One line under the bulk row: the estimated bulk and target rise for the
 * dough temperature and, for cooler loaves, a basket-filling weight.
 * Suggestions apply only when the reader chooses them.
 */
function BulkHint({ id, config, formula, batch, temperatureF, onUseBulk, onUseWeight }: { id: string; config: DoughWorkbenchConfig; formula: DoughFormula; batch: DoughBatch; temperatureF: number; onUseBulk: (minutes: number) => void; onUseWeight: (grams: number) => void }) {
  const process = formula.process!
  const authored = config.defaultSelection.formula
  const referenceTemperature = authored.process?.bulkTemperatureF
  const bench = process.benchMinutes ?? 0
  const reference = referenceTemperature != null && authored.process ? { bulkTemperatureF: referenceTemperature, bulkMinutes: levainToFridgeMinutes(authored.process), levainPercent: authored.levainPercent } : undefined
  const total = estimateBulkMinutes(temperatureF, formula.levainPercent, reference)
  const planned = levainToFridgeMinutes(process)
  const loaf = batch.pieceLabel === 'loaf' && referenceTemperature != null && referenceTemperature - temperatureF >= SMALLER_LOAF_BELOW_F
  const weight = loaf ? bannetonPieceWeight(config.defaultSelection.batch.pieceWeightGrams, referenceTemperature, temperatureF) : null
  const lastFold = process.folds.at(-1)?.atMinutes ?? process.saltDelayMinutes
  const fits = total !== null && total - bench > lastFold
  const useWeight = weight !== null && Math.abs(weight - batch.pieceWeightGrams) >= 1
  return <div id={id} aria-live="polite" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-caption leading-normal text-muted-foreground" data-bulk-hint>
    <span>At {temperatureF}°F: {total !== null && <>about <strong className="font-action text-ink">{formatDuration(total)}</strong> and </>}<strong className="font-action text-ink">{targetRisePercent(temperatureF)}% rise</strong>.{weight !== null && <> Smaller loaves fill the same banneton: <strong className="font-action text-ink">{formatWorkbenchGrams(weight)}</strong>.</>}{total === planned && !useWeight && ' Matches your plan.'}{total !== null && total !== planned && !fits && ' Move folds earlier to use this estimate.'}</span>
    {total !== null && total !== planned && fits && <Button variant="link" type="button" className="text-caption" onClick={() => onUseBulk(total)}>Use {formatDuration(total)}</Button>}
    {useWeight && <Button variant="link" type="button" className="text-caption" onClick={() => onUseWeight(weight!)}>Use {formatWorkbenchGrams(weight!)} loaves</Button>}
  </div>
}

/** A labeled group of fields inside a section, titled like a recipe subsection. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return <div role="group" aria-labelledby={id} className="grid min-w-0 gap-4 border-t border-border pt-5">
    <Eyebrow as="h3" id={id}>{title}</Eyebrow>
    {children}
  </div>
}

/** An optional rest: a labeled switch, a hint, and its length while on. */
function RestToggle({ label, hint, value, onToggle, onChange }: { label: string; hint: string; value: number; onToggle: (on: boolean) => void; onChange: (minutes: number) => void }) {
  const id = useId()
  const on = value > 0
  return <div className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-x-6 gap-y-1 max-[520px]:grid-cols-1">
    <div className="grid gap-1">
      <div className="inline-flex items-center gap-3">
        <Switch id={id} checked={on} onCheckedChange={onToggle} aria-describedby={`${id}-hint`} />
        <label htmlFor={id} className="font-action text-base font-bold">{label}</label>
      </div>
      <p id={`${id}-hint`} className="pl-14 text-caption leading-normal text-muted-foreground">{hint}</p>
    </div>
    <div className={on ? 'max-[520px]:pl-14' : 'invisible max-[520px]:hidden'}>
      {on && <DurationField hideLabel label={`${label} length`} min={1} value={value} onChange={onChange} />}
    </div>
  </div>
}

const FOLD_LABELS: Record<SourdoughFoldMethod, string> = { 'stretch-and-fold': 'stretch and folds', 'coil-fold': 'coil folds', lamination: 'laminations' }

function Section({ title, children, aside, description }: { title: string; children: ReactNode; aside?: ReactNode; description?: ReactNode }) {
  const id = useId()
  return <section aria-labelledby={id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <div className="grid gap-1"><h2 id={id} className="font-action text-title-sm leading-tight font-bold">{title}</h2>{description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>
      {aside}
    </div>
    {children}
  </section>
}

const modeKey = (family: DoughFormula['family']) => `eatyeet:kitchen-mode:${family}`
function useInputMode(config: DoughWorkbenchConfig, family: DoughFormula['family']) {
  const [mode, setMode] = useState<InputMode>(config.defaultInputMode)
  useEffect(() => {
    try { const stored = localStorage.getItem(modeKey(family)); if (stored === 'target' || stored === 'weights') setMode(stored) } catch {}
  }, [family])
  const change = (next: InputMode) => {
    setMode(next)
    try { localStorage.setItem(modeKey(family), next) } catch {}
  }
  return [mode, change] as const
}

/**
 * Every value a dough formula owns, as an ordinary form on the page. The
 * editor is controlled: Notebook owns the state, saving and history.
 */
export function DoughFormulaEditor({ recipe, config, state, onChange, onErrorsChange, resetKey }: {
  recipe: RecipeContent
  config: DoughWorkbenchConfig
  state: DoughWorkbenchState
  onChange: (state: DoughWorkbenchState) => void
  onErrorsChange: (errors: string[]) => void
  resetKey: number
}) {
  const [weightDraft, setWeightDraft] = useState<ReverseFormulaInput | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [localReset, setLocalReset] = useState(0)
  const [buildOpen, setBuildOpen] = useState(false)
  const [mode, setMode] = useInputMode(config, state.formula.family)
  const prefix = useId()
  const report = useCallback<NumberFieldValidation>((id, error) => {
    setFieldErrors((current) => {
      if ((current[id] ?? null) === error) return current
      const next = { ...current }
      if (error) next[id] = error
      else delete next[id]
      return next
    })
  }, [])
  const numericFields = useMemo(() => ({ report, resetKey: resetKey + localReset }), [report, resetKey, localReset])
  useEffect(() => { setWeightDraft(null) }, [resetKey])

  const { formula, batch } = state
  const result = useMemo(() => calculateFormula(formula, batch), [formula, batch])
  const seedRatio = formula.levainBuild?.flourPerSeed ?? 2
  const seed = formula.levainBuild?.seed ?? starterFrom(formula)
  const levainBuild = { seed, flourPerSeed: seedRatio, extraPercent: levainExtraPercent(formula.levainBuild ?? {}) }
  const process = formula.process
  const weightInputs: ReverseFormulaInput = weightDraft ?? {
    family: formula.family,
    freshFlour: result.freshFlour,
    addedWaterGrams: result.addedWaterGrams,
    saltGrams: result.saltGrams,
    oilGrams: result.oilGrams,
    sugarGrams: result.sugarGrams,
    maltGrams: result.maltGrams,
    yeastGrams: result.yeastGrams,
    levainGrams: result.levainGrams,
    starter: formula.starter,
  }
  const editableStarter = mode === 'weights' ? weightInputs.starter : formula.starter
  const reverseRows = weightInputs.freshFlour.map((part) => ({ ...part, percent: part.grams }))
  const reverseErrors = weightDraft ? reverseFormula(weightDraft).errors : []
  const build = formula.starter && result.levainGrams > 0 ? calculateDoughLevainBuild(result.levainGrams, formula.starter, levainBuild) : null
  const errors = useMemo(() => [...new Set([...Object.values(fieldErrors), ...reverseErrors, ...result.errors, ...(build ? build.errors : [])])], [fieldErrors, reverseErrors.join('\n'), result.errors, build?.errors.join('\n')])
  const reported = useRef('')
  useEffect(() => {
    const key = errors.join('\n')
    if (key === reported.current) return
    reported.current = key
    onErrorsChange(errors)
  }, [errors, onErrorsChange])

  const method = selectedRecipeMethod(recipe, state.methodId)
  const pizza = formula.family === 'pizza'
  const recommended = config.recommendedFormulas[state.methodId]

  const updateBatch = (changes: Partial<DoughBatch>) => {
    setWeightDraft(null)
    onChange({ ...state, batch: { ...batch, ...('pieceWeightGrams' in changes ? { diameterInches: undefined } : {}), ...changes } })
  }
  const updateFormula = (changes: Partial<DoughFormula>) => {
    setWeightDraft(null)
    onChange({ ...state, formula: { ...formula, ...changes } })
  }
  const applyReverse = (changes: Partial<{ freshFlour: FlourComponent[]; addedWaterGrams: number; saltGrams: number; oilGrams: number; sugarGrams: number; maltGrams: number; yeastGrams: number; levainGrams: number; starter: StarterProfile }>) => {
    const current = weightInputs
    const nextRows = changes.freshFlour ?? current.freshFlour.map((part) => ({ ...part, percent: part.grams }))
    const next: ReverseFormulaInput = {
      family: formula.family,
      freshFlour: nextRows.map((part) => ({ id: part.id, name: part.name, grams: part.percent })),
      addedWaterGrams: changes.addedWaterGrams ?? current.addedWaterGrams,
      saltGrams: changes.saltGrams ?? current.saltGrams,
      oilGrams: changes.oilGrams ?? current.oilGrams,
      sugarGrams: changes.sugarGrams ?? current.sugarGrams,
      maltGrams: changes.maltGrams ?? current.maltGrams,
      yeastGrams: changes.yeastGrams ?? current.yeastGrams,
      levainGrams: changes.levainGrams ?? current.levainGrams,
      starter: formula.family === 'sourdough' ? changes.starter ?? current.starter ?? starterFrom(formula) : undefined,
    }
    setWeightDraft(next)
    const reversed = reverseFormula(next)
    if (reversed.errors.length) return
    onChange({ ...state, formula: { ...formula, ...reversed.formula }, batch: { ...batch, diameterInches: undefined, pieceWeightGrams: reversed.totalDoughGrams / batch.count } })
  }
  const pizzaProcess = pizza ? formula.pizzaProcess : undefined
  const updatePizza = (changes: Partial<PizzaProcess>) => { if (pizzaProcess) { updateFormula({ pizzaProcess: { ...pizzaProcess, ...changes } }); setLocalReset((key) => key + 1) } }
  const updateProcess = (changes: Partial<SourdoughProcess>) => { if (process) updateFormula({ process: { ...process, ...changes } }) }
  const plan: FoldPlan | null = useMemo(() => process ? foldGroups(process) : null, [process])
  const newFoldId = () => `fold-${crypto.randomUUID()}`
  const updatePlan = (next: FoldPlan) => { if (process) updateProcess({ folds: foldsFromGroups(process.saltDelayMinutes, next, newFoldId) }) }
  const updateGroup = (index: number, changes: Partial<FoldGroup>) => { if (plan) updatePlan({ ...plan, groups: plan.groups.map((group, groupIndex) => groupIndex === index ? { ...group, ...changes } : group) }) }
  const setSaltDelay = (saltDelayMinutes: number) => { if (process && plan) updateProcess({ saltDelayMinutes, folds: foldsFromGroups(saltDelayMinutes, plan, newFoldId) }) }
  const authoredProcess = config.defaultSelection.formula.process
  const remembered = useRef<{ autolyseMinutes?: number; saltDelayMinutes?: number }>({})
  const toggleRest = (key: 'autolyseMinutes' | 'saltDelayMinutes', on: boolean) => {
    if (!process) return
    if (!on) remembered.current[key] = process[key]
    const restored = remembered.current[key] || authoredProcess?.[key] || (key === 'autolyseMinutes' ? 30 : 15)
    if (key === 'saltDelayMinutes') setSaltDelay(on ? restored : 0)
    else updateProcess({ autolyseMinutes: on ? restored : 0 })
    setLocalReset((count) => count + 1)
  }
  const preshapeRest = Math.min(process?.preshapeMinutes ?? 0, process?.benchMinutes ?? 0)
  const shapingRest = (process?.benchMinutes ?? 0) - preshapeRest
  const [focusGroup, setFocusGroup] = useState<number | 'add' | null>(null)
  useEffect(() => {
    if (focusGroup === null) return
    document.getElementById(focusGroup === 'add' ? `${prefix}-add-folds` : `${prefix}-group-${focusGroup}`)?.focus()
    setFocusGroup(null)
  }, [focusGroup, prefix])
  const bulkTemperature = process?.bulkTemperatureF ?? config.defaultSelection.formula.process?.bulkTemperatureF ?? 75
  const updateSeed = (next: StarterProfile) => updateFormula({ levainBuild: { ...levainBuild, seed: next } })
  const pieces = pieceCountLabel(2, batch.pieceLabel)

  return <NumericFields.Provider value={numericFields}>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10" data-dough-editor={formula.family}>
      {/* The oven or method comes first: it sets the recommended formula and process. */}
      {recipe.methodOptions.length > 1 && <Section title={pizza ? 'Oven' : 'Method'}>
        {recipe.methodOptions.length <= 3
          ? <ChoiceGroup size="compact" label={pizza ? 'Oven method' : 'Baking method'} className="w-[380px] max-w-full" value={state.methodId} onChange={(methodId) => onChange({ ...state, methodId })} options={recipe.methodOptions.map((option) => ({ value: option.id, label: option.label }))} />
          : <div className="grid max-w-[380px] gap-1"><label htmlFor={`${prefix}-method`} className="font-action text-sm font-bold">{pizza ? 'Oven method' : 'Baking method'}</label><Select surface="underline" id={`${prefix}-method`} value={state.methodId} onChange={(event) => onChange({ ...state, methodId: event.target.value })}>{recipe.methodOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select></div>}
        {recommended && !formulasMatch(recommended, formula) && <Button variant="link" type="button" className="justify-self-start" onClick={() => { setLocalReset((key) => key + 1); updateFormula(clone(recommended)) }}>Use the recommended formula for {method?.label ?? 'this method'}</Button>}
      </Section>}

      <Section title="Size" description="Choose how many to make on the bake sheet.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          {pizza && config.pizzaSizing && <div className="grid min-w-0 content-start gap-1">
            <label htmlFor={`${prefix}-size`} className="font-action text-sm font-bold">Pizza size</label>
            <Select surface="underline" id={`${prefix}-size`} value={batch.diameterInches ?? ''} onChange={(event) => {
              if (!event.target.value) { updateBatch({ diameterInches: undefined }); return }
              const diameterInches = Number(event.target.value)
              updateBatch({ diameterInches, pieceWeightGrams: pizzaBallWeight(diameterInches, config.pizzaSizing!) })
              setLocalReset((key) => key + 1)
            }}>
              <option value="">Custom weight</option>
              {config.pizzaSizing.diametersInches.map((diameter) => <option key={diameter} value={diameter}>{diameter}-inch</option>)}
            </Select>
          </div>}
          <Field label={pizza ? 'Ball weight' : `${batch.pieceLabel === 'loaf' ? 'Loaf' : 'Ball'} weight`} suffix="g" positive decimalPlaces={0} value={batch.pieceWeightGrams} onChange={(pieceWeightGrams) => updateBatch({ pieceWeightGrams })} />
        </div>
      </Section>

      <Section title="Formula" aside={<ChoiceGroup size="compact" label="Enter the formula as" className="w-[300px] max-w-full" value={mode} onChange={(next) => { setMode(next); setWeightDraft(null); setLocalReset((key) => key + 1) }} options={[{ value: 'target', label: 'Percentages' }, { value: 'weights', label: 'Weights' }]} />}>
        {mode === 'target' ? <>
          <FlourEditor label="Flour blend" value={formula.flour} onChange={(flour) => updateFormula({ flour })} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
            <Field label="Hydration" suffix="%" value={formula.hydrationPercent} onChange={(hydrationPercent) => updateFormula({ hydrationPercent })} />
            <Field label="Fine sea salt" suffix="%" value={formula.saltPercent} onChange={(saltPercent) => updateFormula({ saltPercent })} />
            {pizza && <>
              <Field label="SAF red instant yeast" suffix="%" decimalPlaces={2} value={formula.yeastPercent} onChange={(yeastPercent) => updateFormula({ yeastPercent })} />
              <Field label="Sugar" suffix="%" value={formula.sugarPercent} onChange={(sugarPercent) => updateFormula({ sugarPercent })} />
              <Field label="Oil" suffix="%" value={formula.oilPercent} onChange={(oilPercent) => updateFormula({ oilPercent })} />
              <Field label="Malt powder" suffix="%" value={formula.maltPercent} onChange={(maltPercent) => updateFormula({ maltPercent })} />
            </>}
            {!pizza && <Field label="Ripe levain" suffix="% of flour" value={formula.levainPercent} onChange={(levainPercent) => updateFormula({ levainPercent })} />}
          </div>
        </> : <>
          <FlourEditor label="Flour weights" value={reverseRows} unit="g" onChange={(freshFlour) => applyReverse({ freshFlour })} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
            <Field label="Added water" suffix="g" value={weightInputs.addedWaterGrams ?? 0} onChange={(addedWaterGrams) => applyReverse({ addedWaterGrams })} />
            <Field label="Fine sea salt" suffix="g" value={weightInputs.saltGrams ?? 0} onChange={(saltGrams) => applyReverse({ saltGrams })} />
            {pizza && <>
              <Field label="SAF red instant yeast" suffix="g" decimalPlaces={yeastGramPrecision(weightInputs.yeastGrams ?? 0)} value={weightInputs.yeastGrams ?? 0} onChange={(yeastGrams) => applyReverse({ yeastGrams })} />
              <Field label="Sugar" suffix="g" value={weightInputs.sugarGrams ?? 0} onChange={(sugarGrams) => applyReverse({ sugarGrams })} />
              <Field label="Oil" suffix="g" value={weightInputs.oilGrams ?? 0} onChange={(oilGrams) => applyReverse({ oilGrams })} />
              <Field label="Malt powder" suffix="g" value={weightInputs.maltGrams ?? 0} onChange={(maltGrams) => applyReverse({ maltGrams })} />
            </>}
            {!pizza && <Field label="Ripe starter" suffix="g" value={weightInputs.levainGrams ?? 0} onChange={(levainGrams) => applyReverse({ levainGrams })} />}
          </div>
        </>}
      </Section>

      {!pizza && editableStarter && <Section title="Ripe starter / levain" description="Starter hydration, flour and the levain build belong to this formula.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
          <Field label="Starter hydration" positive suffix="%" value={editableStarter.hydrationPercent} onChange={(hydrationPercent) => mode === 'weights' ? applyReverse({ starter: { ...editableStarter, hydrationPercent } }) : updateFormula({ starter: { ...editableStarter, hydrationPercent } })} />
        </div>
        <FlourEditor label="Starter flour" prefix="Starter" value={editableStarter.flour} onChange={(flour) => mode === 'weights' ? applyReverse({ starter: { ...editableStarter, flour } }) : updateFormula({ starter: { ...editableStarter, flour } })} />
        <Button variant="link" type="button" className="justify-self-start" aria-expanded={buildOpen} aria-controls={`${prefix}-build`} onClick={() => setBuildOpen((open) => !open)}>{buildOpen ? 'Hide levain build' : 'Build this levain'}</Button>
        <div id={`${prefix}-build`} hidden={!buildOpen || !build} className="grid gap-5 rounded-field border border-border bg-white p-5">
          {build && <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
              <Field label="Fresh flour per 1 part seed" positive suffix="parts" value={seedRatio} onChange={(flourPerSeed) => updateFormula({ levainBuild: { ...levainBuild, flourPerSeed } })} />
              <Field label="Extra to build" suffix="%" max={MAX_LEVAIN_EXTRA_PERCENT} value={levainBuild.extraPercent} onChange={(extraPercent) => updateFormula({ levainBuild: { ...levainBuild, extraPercent } })} />
              <Field label="Seed hydration" suffix="%" value={seed.hydrationPercent} onChange={(hydrationPercent) => updateSeed({ ...seed, hydrationPercent })} />
            </div>
            <FlourEditor label="Seed starter flour" prefix="Seed" value={seed.flour} onChange={(flour) => updateSeed({ ...seed, flour })} />
            <p className="text-sm"><strong>1:{formatNumberFieldValue(seedRatio, 1)}</strong> seed to fresh flour: <strong>{formatWorkbenchGrams(build.seedStarterGrams)}</strong> seed starter + {build.freshFlour.map((part) => `${formatWorkbenchGrams(part.grams)} ${part.name}`).join(' + ')} + <strong>{formatWorkbenchGrams(build.addedWaterGrams)}</strong> water{levainYield(build.buildGrams, result.levainGrams, formatWorkbenchGrams)}</p>
          </>}
        </div>
      </Section>}


      {pizzaProcess && <Section title="Mixing and fermentation" description="Times count from when you start mixing.">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
          <ChoiceGroup size="compact" label="Mixing method" className="w-[420px] max-w-full" value={pizzaProcess.mixingMethod} onChange={(mixingMethod: PizzaMixingMethod) => updatePizza({ mixingMethod })}
            options={(['spiral', 'food-processor', 'hand'] as const).map((value) => ({ value, label: { spiral: 'Mixer', 'food-processor': 'Processor', hand: 'By hand' }[value] }))} />
          {/* One reserved hint, so switching methods never moves the page. */}
          <p className="min-h-[3lh] text-caption leading-normal text-muted-foreground">
            {pizzaProcess.mixingMethod === 'food-processor' ? 'Use ice-cold water with no ice. Run on high until the dough reaches about 77°F.'
              : pizzaProcess.mixingMethod === 'hand' ? `Mix, rest ${formatDuration(HAND_REST_MINUTES)}, then knead; the rest counts toward bulk.`
              : 'Mix until smooth and about 77°F.'}
            {batch.count <= FOOD_PROCESSOR_MAX_BALLS && pizzaProcess.mixingMethod !== 'food-processor' && <> For {batch.count === 1 ? 'one ball' : 'two balls'}, a food processor is easiest. <Button variant="link" type="button" className="text-caption" onClick={() => updatePizza({ mixingMethod: 'food-processor' })}>Use food processor</Button></>}
          </p>
        </div>
        <Group title="Fermentation">
          <div className="grid grid-cols-2 items-end gap-x-6 gap-y-5 md:grid-cols-4">
            <Field label="Dough temperature" suffix="°F" step="1" decimalPlaces={0} min={PIZZA_TEMPERATURE_RANGE_F[0]} max={PIZZA_TEMPERATURE_RANGE_F[1]} value={pizzaProcess.bulkTemperatureF} onChange={(bulkTemperatureF) => updateFormula({ pizzaProcess: { ...pizzaProcess, bulkTemperatureF } })} />
            <DurationField label="Divide and ball at" min={pizzaProcess.mixingMethod === 'hand' ? HAND_REST_MINUTES + 1 : 1} value={pizzaProcess.bulkMinutes} onChange={(bulkMinutes) => updateFormula({ pizzaProcess: { ...pizzaProcess, bulkMinutes } })} />
            <div className="col-span-2 grid min-w-0 gap-1">
              <span aria-hidden="true" className="font-action text-sm font-bold">Cold ferment</span>
              <ChoiceGroup size="compact" label="Cold ferment days" value={String(pizzaProcess.coldDays) as `${typeof COLD_DAYS[number]}`} onChange={(days) => updatePizza({ coldDays: Number(days), warmUpMinutes: warmUpForColdDays(Number(days)) })}
                options={COLD_DAYS.map((days) => ({ value: String(days) as `${typeof days}`, label: `${days} days` }))} />
            </div>
            <DurationField label="Warm-up" value={pizzaProcess.warmUpMinutes} describedBy={`${prefix}-warm-hint`} onChange={(warmUpMinutes) => updateFormula({ pizzaProcess: { ...pizzaProcess, warmUpMinutes } })} />
          </div>
          <p id={`${prefix}-warm-hint`} className="text-caption leading-normal text-muted-foreground">Warm-up follows the cold ferment: 4h after 2 days, 3h after 3, 2h after 4.</p>
        </Group>
      </Section>}

      {process && plan && <Section title="Mixing and fermentation" description="Times count from mixing in the levain. Follow the dough’s rise as well as the clock.">
        <ChoiceGroup size="compact" label="Mixing method" className="w-[340px] max-w-full" value={process.mixingMethod} onChange={(mixingMethod) => updateProcess({ mixingMethod })} options={[{ value: 'hand', label: 'By hand' }, { value: 'spiral', label: 'Spiral mixer' }]} />
        <Group title="Before bulk">
          <RestToggle label="Autolyse" hint="Rest flour and water before adding the levain." value={process.autolyseMinutes} onToggle={(on) => toggleRest('autolyseMinutes', on)} onChange={(autolyseMinutes) => updateProcess({ autolyseMinutes })} />
          <RestToggle label="Fermentolyse" hint="Rest with the levain before adding salt and the remaining water." value={process.saltDelayMinutes} onToggle={(on) => toggleRest('saltDelayMinutes', on)} onChange={setSaltDelay} />
        </Group>
        <Group title="Folds">
          {plan.groups.length > 0 && <div aria-hidden="true" className="-mb-2 grid grid-cols-[minmax(0,1fr)_84px_112px_44px] gap-4 font-action text-sm font-bold max-[520px]:hidden"><span>Technique</span><span>Sets</span><span>Every</span><span /></div>}
          {plan.groups.map((group, index) => {
            const start = plan.groups.slice(0, index).reduce((count, item) => count + item.count, 0)
            const times = process.folds.slice(start, start + group.count).map((fold) => formatDuration(fold.atMinutes))
            return <div key={group.ids[0] ?? index} className="grid gap-2">
              <div className="grid grid-cols-[minmax(0,1fr)_84px_112px_44px] items-end gap-4 max-[520px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]">
                <div className="grid min-w-0 gap-1 max-[520px]:col-span-3">
                  <label htmlFor={`${prefix}-group-${index}`} className="sr-only">Group {index + 1} technique</label>
                  <Select surface="underline" id={`${prefix}-group-${index}`} value={group.method} onChange={(event) => updateGroup(index, { method: event.target.value as SourdoughFoldMethod })}>
                    <option value="stretch-and-fold">Stretch and fold</option>
                    <option value="coil-fold">Coil fold</option>
                    <option value="lamination">Lamination</option>
                  </Select>
                </div>
                <Field hideLabel label={`Group ${index + 1} sets`} suffix="×" step="1" min={1} max={20} decimalPlaces={0} value={group.count} onChange={(count) => updateGroup(index, { count })} />
                <DurationField hideLabel label={`Group ${index + 1} every`} min={1} value={group.everyMinutes} onChange={(everyMinutes) => updateGroup(index, { everyMinutes })} />
                <Button variant="danger" size="icon" type="button" aria-label={`Remove group ${index + 1}: ${FOLD_LABELS[group.method]}`} onClick={() => { updatePlan({ ...plan, groups: plan.groups.filter((_, groupIndex) => groupIndex !== index) }); setFocusGroup(index < plan.groups.length - 1 ? index : 'add') }}><Trash2 className="size-4" /></Button>
              </div>
              <p className="text-caption tabular-nums text-muted-foreground">At {times.join(', ')}</p>
            </div>
          })}
          {plan.groups.length === 0 && <p className="text-sm">No folds scheduled.</p>}
          <Button id={`${prefix}-add-folds`} variant="link" type="button" className="justify-self-start gap-1" onClick={() => {
            const last = plan.groups.at(-1)
            updatePlan({ ...plan, groups: [...plan.groups, { method: last?.method === 'stretch-and-fold' ? 'coil-fold' : last?.method ?? process.foldMethod, count: 1, everyMinutes: last?.everyMinutes ?? 30, ids: [] }] })
            setFocusGroup(plan.groups.length)
          }}><Plus className="size-4" />Add folds</Button>
          {plan.groups.length > 0 && <div className="max-w-[240px]"><DurationField label="First fold after salt" min={1} value={plan.startMinutes} onChange={(startMinutes) => updatePlan({ ...plan, startMinutes })} /></div>}
        </Group>
        <Group title="Bulk and shaping">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
            <Field label="Dough temperature" suffix="°F" step="1" decimalPlaces={0} min={BULK_TEMPERATURE_RANGE_F[0]} max={BULK_TEMPERATURE_RANGE_F[1]} value={bulkTemperature} onChange={(bulkTemperatureF) => updateProcess({ bulkTemperatureF })} />
            <DurationField label="Into the refrigerator at" min={(process.benchMinutes ?? 0) + 1} describedBy={`${prefix}-bulk-hint`} value={levainToFridgeMinutes(process)} onChange={(minutes) => updateProcess({ bulkMinutes: minutes - (process.benchMinutes ?? 0) })} />
            <DurationField label="Preshape rest" value={preshapeRest} onChange={(preshapeMinutes) => updateProcess({ preshapeMinutes, benchMinutes: preshapeMinutes + shapingRest, bulkMinutes: levainToFridgeMinutes(process) - preshapeMinutes - shapingRest })} />
            <DurationField label="Shaping rest" value={shapingRest} onChange={(rest) => updateProcess({ preshapeMinutes: preshapeRest, benchMinutes: preshapeRest + rest, bulkMinutes: levainToFridgeMinutes(process) - preshapeRest - rest })} />
          </div>
          <BulkHint id={`${prefix}-bulk-hint`} config={config} formula={formula} batch={batch} temperatureF={bulkTemperature} onUseBulk={(minutes) => { updateProcess({ bulkMinutes: minutes - (process.benchMinutes ?? 0) }); setLocalReset((key) => key + 1) }} onUseWeight={(pieceWeightGrams) => { updateBatch({ pieceWeightGrams }); setLocalReset((key) => key + 1) }} />
        </Group>
        <p className="text-caption text-muted-foreground">Estimates follow <Button variant="link" className="inline text-caption" asChild><a href={GUIDELINES_URL} target="_blank" rel="noreferrer">The Sourdough Journey’s bulk fermentation guidelines</a></Button>. Times are estimates; follow the rise.</p>
      </Section>}
      {!pizza && <p className="text-sm text-muted-foreground">{formatPercent(result.prefermentedFlourPercent)} of the flour is prefermented in the levain.</p>}
    </div>
  </NumericFields.Provider>
}
