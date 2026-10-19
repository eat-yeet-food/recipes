'use client'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { pizzaBallWeight } from '@eat-yeet/l2-recipe-domain/pizza-sizing'
import type { SourdoughFoldMethod, SourdoughProcess } from '@eat-yeet/l2-recipe-domain/sourdough-process'
import { calculateFormula, calculateLevainBuild, formatPercent, reverseFormula, type DoughBatch, type DoughFormula, type FlourComponent, type ReverseFormulaInput, type StarterProfile } from '@eat-yeet/l2-recipe-domain/formula'
import { selectedRecipeMethod, type RecipeContent } from '@eat-yeet/l4-content-model/recipes'
import { Button } from '@eat-yeet/l5-ui-primitives/primitives/button'
import { ChoiceGroup } from '@eat-yeet/l5-ui-primitives/primitives/choice-group'
import { Input } from '@eat-yeet/l5-ui-primitives/primitives/input'
import { NumberField, formatNumberFieldValue, type NumberFieldPrecision, type NumberFieldValidation } from '@eat-yeet/l5-ui-primitives/primitives/number-field'
import { Select } from '@eat-yeet/l5-ui-primitives/primitives/select'
import { clone, formatWorkbenchGrams, pieceCountLabel, starterFrom, yeastGramPrecision, type DoughWorkbenchConfig, type DoughWorkbenchState, type InputMode } from './dough-workbench-model'
import { formulasMatch } from './dough-formula-match'

const NumericFields = createContext<{ report: NumberFieldValidation; resetKey: number } | null>(null)

function Field({ label, value, onChange, suffix, step, min = 0, max, positive = false, hideLabel = false, decimalPlaces }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: string; min?: number; max?: number; positive?: boolean; hideLabel?: boolean; decimalPlaces?: NumberFieldPrecision }) {
  const fields = useContext(NumericFields)
  const precision = decimalPlaces ?? (suffix === 'g' && Math.abs(value) >= 20 ? 0 : 1)
  return <NumberField surface="underline" decimalPlaces={precision} label={label} value={value} onValueChange={onChange} suffix={suffix} min={min} max={max} integer={step === '1'} positive={positive} hideLabel={hideLabel} onValidationChange={fields?.report} resetKey={fields?.resetKey} />
}

/** Edit whole-minute durations without requiring mental conversion from hours. */
function DurationField({ label, value, onChange }: { label: string; value: number; onChange: (minutes: number) => void }) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return <fieldset className="grid min-w-0 gap-1">
    <legend className="mb-1 font-action text-sm font-bold">{label}</legend>
    <div className="grid grid-cols-2 gap-4">
      <Field hideLabel label={`${label} hours`} suffix="hr" step="1" value={hours} onChange={(next) => onChange(next * 60 + minutes)} />
      <Field hideLabel label={`${label} minutes`} suffix="min" step="1" max={59} value={minutes} onChange={(next) => onChange(hours * 60 + next)} />
    </div>
  </fieldset>
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

function Section({ title, children, aside, description }: { title: string; children: ReactNode; aside?: ReactNode; description?: ReactNode }) {
  const id = useId()
  return <section aria-labelledby={id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <div className="grid gap-1"><h2 id={id} className="font-action text-[22px] leading-tight font-bold">{title}</h2>{description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>
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
 * editor is controlled: Test Kitchen owns the state, saving and history.
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
  const build = formula.starter && result.levainGrams > 0 ? calculateLevainBuild(result.levainGrams, formula.starter, seed, seedRatio) : null
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
  const updateProcess = (changes: Partial<SourdoughProcess>) => { if (process) updateFormula({ process: { ...process, ...changes } }) }
  const addFoldingStep = (afterIndex: number) => {
    if (!process) return
    const previous = process.folds[afterIndex]
    const next = process.folds[afterIndex + 1]
    const start = previous?.atMinutes ?? process.saltDelayMinutes
    const atMinutes = next ? Math.floor((start + next.atMinutes) / 2) : start + 30
    const folds = [...process.folds]
    folds.splice(afterIndex + 1, 0, { id: `fold-${crypto.randomUUID()}`, atMinutes, method: previous?.method === 'lamination' ? 'coil-fold' : previous?.method ?? process.foldMethod })
    updateProcess({ folds, bulkMinutes: next ? process.bulkMinutes : Math.max(process.bulkMinutes, atMinutes + 30) })
  }
  const updateSeed = (next: StarterProfile) => updateFormula({ levainBuild: { seed: next, flourPerSeed: seedRatio } })
  const pieces = pieceCountLabel(2, batch.pieceLabel)

  return <NumericFields.Provider value={numericFields}>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10" data-dough-editor={formula.family}>
      <Section title="Usual batch" description="What this formula normally makes. A bake sheet can make more or fewer without changing it.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          <Field label={pizza ? 'Pizzas' : pieces.charAt(0).toUpperCase() + pieces.slice(1)} value={batch.count} min={1} step="1" onChange={(count) => updateBatch({ count })} />
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
          <Field label="Total dough" suffix="g" positive decimalPlaces={0} value={batch.count * batch.pieceWeightGrams} onChange={(total) => updateBatch({ pieceWeightGrams: total / batch.count })} />
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
        <div id={`${prefix}-build`} hidden={!buildOpen || !build} className="grid gap-5 rounded-field bg-tint p-5">
          {build && <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Fresh flour per 1 part seed" positive suffix="parts" value={seedRatio} onChange={(flourPerSeed) => updateFormula({ levainBuild: { seed, flourPerSeed } })} />
              <Field label="Seed hydration" suffix="%" value={seed.hydrationPercent} onChange={(hydrationPercent) => updateSeed({ ...seed, hydrationPercent })} />
            </div>
            <FlourEditor label="Seed starter flour" prefix="Seed" value={seed.flour} onChange={(flour) => updateSeed({ ...seed, flour })} />
            <p className="text-sm"><strong>1:{formatNumberFieldValue(seedRatio, 1)}</strong> seed to fresh flour: <strong>{formatWorkbenchGrams(build.seedStarterGrams)}</strong> seed starter + {build.freshFlour.map((part) => `${formatWorkbenchGrams(part.grams)} ${part.name}`).join(' + ')} + <strong>{formatWorkbenchGrams(build.addedWaterGrams)}</strong> water</p>
          </>}
        </div>
      </Section>}

      {recipe.methodOptions.length > 1 && <Section title={pizza ? 'Oven' : 'Method'}>
        {recipe.methodOptions.length <= 3
          ? <ChoiceGroup size="compact" label={pizza ? 'Oven method' : 'Baking method'} className="w-[380px] max-w-full" value={state.methodId} onChange={(methodId) => onChange({ ...state, methodId })} options={recipe.methodOptions.map((option) => ({ value: option.id, label: option.label }))} />
          : <div className="grid max-w-[380px] gap-1"><label htmlFor={`${prefix}-method`} className="font-action text-sm font-bold">{pizza ? 'Oven method' : 'Baking method'}</label><Select surface="underline" id={`${prefix}-method`} value={state.methodId} onChange={(event) => onChange({ ...state, methodId: event.target.value })}>{recipe.methodOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select></div>}
        {recommended && !formulasMatch(recommended, formula) && <Button variant="link" type="button" className="justify-self-start" onClick={() => { setLocalReset((key) => key + 1); updateFormula(clone(recommended)) }}>Use the recommended formula for {method?.label ?? 'this method'}</Button>}
      </Section>}

      {process && <Section title="Mixing and fermentation" description="Times start when you mix in the levain. Follow the dough’s rise as well as the clock.">
        <ChoiceGroup size="compact" label="Mixing method" className="w-[340px] max-w-full" value={process.mixingMethod} onChange={(mixingMethod) => updateProcess({ mixingMethod })} options={[{ value: 'hand', label: 'By hand' }, { value: 'spiral', label: 'Spiral mixer' }]} />
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <DurationField label="Autolyse before bulk" value={process.autolyseMinutes} onChange={(autolyseMinutes) => updateProcess({ autolyseMinutes })} />
          <DurationField label="Add fine sea salt at" value={process.saltDelayMinutes} onChange={(saltDelayMinutes) => updateProcess({ saltDelayMinutes })} />
          <DurationField label="Planned end of bulk" value={process.bulkMinutes} onChange={(bulkMinutes) => updateProcess({ bulkMinutes })} />
        </div>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">Choose a technique for each step. Mix stretch and folds, coil folds and lamination in the order you use them.</p>
          {process.folds.map((fold, index) => <div key={fold.id} className="grid gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_44px] items-end gap-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 max-[640px]:grid-cols-1">
                <div className="grid min-w-0 gap-1">
                  <label htmlFor={`${prefix}-${fold.id}`} className="font-action text-sm font-bold">Step {index + 1} technique</label>
                  <Select surface="underline" id={`${prefix}-${fold.id}`} value={fold.method ?? process.foldMethod} onChange={(event) => updateProcess({ folds: process.folds.map((item) => item.id === fold.id ? { ...item, method: event.target.value as SourdoughFoldMethod } : item) })}>
                    <option value="stretch-and-fold">Stretch and fold</option>
                    <option value="coil-fold">Coil fold</option>
                    <option value="lamination">Lamination</option>
                  </Select>
                </div>
                <DurationField label={`Step ${index + 1} at`} value={fold.atMinutes} onChange={(atMinutes) => updateProcess({ folds: process.folds.map((item) => item.id === fold.id ? { ...item, atMinutes } : item) })} />
              </div>
              <Button variant="danger" size="icon" type="button" aria-label={`Remove step ${index + 1}`} onClick={() => updateProcess({ folds: process.folds.filter((item) => item.id !== fold.id) })}><Trash2 className="size-4" /></Button>
            </div>
            {index < process.folds.length - 1 && <Button variant="link" type="button" className="justify-self-start" disabled={process.folds[index + 1].atMinutes - fold.atMinutes < 2} onClick={() => addFoldingStep(index)}>Insert step after step {index + 1}</Button>}
          </div>)}
          {process.folds.length === 0 && <p className="text-sm">No folding steps scheduled.</p>}
          <Button variant="link" type="button" className="justify-self-start gap-1" onClick={() => addFoldingStep(process.folds.length - 1)}><Plus className="size-4" />Add step</Button>
        </div>
      </Section>}
      {!pizza && <p className="text-sm text-muted-foreground">{formatPercent(result.prefermentedFlourPercent)} of the flour is prefermented in the levain.</p>}
    </div>
  </NumericFields.Provider>
}
