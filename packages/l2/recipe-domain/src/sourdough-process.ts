export type SourdoughFoldMethod = 'stretch-and-fold' | 'coil-fold' | 'lamination'

export interface SourdoughProcess {
  mixingMethod: 'hand' | 'spiral'
  /** Fallback for saved formulas and shared links created before per-step techniques. */
  foldMethod: 'stretch-and-fold' | 'coil-fold'
  autolyseMinutes: number
  saltDelayMinutes: number
  bulkMinutes: number
  /** Where the dough sits during bulk fermentation; absent in formulas saved before temperature planning. */
  bulkTemperatureF?: number
  /** Preshape and shaping rests after dividing, until the dough goes into the refrigerator. Absent means none planned. */
  benchMinutes?: number
  /** Of the bench time, the rest after dividing and preshaping, before final shaping. Absent means not split. */
  preshapeMinutes?: number
  folds: Array<{ id: string; atMinutes: number; method?: SourdoughFoldMethod }>
}

/** Backward-compatible process for formulas shared before process controls existed. */
export const DEFAULT_SOURDOUGH_PROCESS: SourdoughProcess = {
  mixingMethod: 'spiral', foldMethod: 'coil-fold', autolyseMinutes: 180,
  saltDelayMinutes: 30, bulkMinutes: 290,
  folds: [{ id: 'fold-1', atMinutes: 60 }, { id: 'fold-2', atMinutes: 90 }, { id: 'fold-3', atMinutes: 120 }],
}

export function isSourdoughProcess(value: unknown): value is SourdoughProcess {
  if (!value || typeof value !== 'object') return false
  const process = value as SourdoughProcess
  return (process.mixingMethod === 'hand' || process.mixingMethod === 'spiral') &&
    (process.foldMethod === 'stretch-and-fold' || process.foldMethod === 'coil-fold') &&
    (process.bulkTemperatureF == null || Number.isFinite(process.bulkTemperatureF)) &&
    (process.benchMinutes == null || Number.isSafeInteger(process.benchMinutes)) &&
    (process.preshapeMinutes == null || Number.isSafeInteger(process.preshapeMinutes)) &&
    [process.autolyseMinutes, process.saltDelayMinutes, process.bulkMinutes].every(Number.isSafeInteger) &&
    Array.isArray(process.folds) && process.folds.every((fold) => fold && typeof fold.id === 'string' && Number.isSafeInteger(fold.atMinutes) &&
      (fold.method === undefined || fold.method === 'stretch-and-fold' || fold.method === 'coil-fold' || fold.method === 'lamination'))
}

export function sourdoughProcessErrors(process: SourdoughProcess): string[] {
  if (!isSourdoughProcess(process)) return ['Use whole minutes and a supported mixing and folding method.']
  const errors: string[] = []
  if (process.autolyseMinutes < 0 || process.saltDelayMinutes < 0 || process.bulkMinutes <= 0) errors.push('Rest times must be zero or greater; bulk fermentation must be positive.')
  if (process.bulkTemperatureF != null && (process.bulkTemperatureF < BULK_TEMPERATURE_RANGE_F[0] || process.bulkTemperatureF > BULK_TEMPERATURE_RANGE_F[1])) errors.push(`Plan bulk fermentation between ${BULK_TEMPERATURE_RANGE_F[0]}°F and ${BULK_TEMPERATURE_RANGE_F[1]}°F.`)
  if (process.benchMinutes != null && process.benchMinutes < 0) errors.push('Preshape and shaping rests must be zero or greater.')
  if (process.preshapeMinutes != null && (process.preshapeMinutes < 0 || process.preshapeMinutes > (process.benchMinutes ?? 0))) errors.push('The preshape rest must fit within the preshape and shaping time.')
  if (process.saltDelayMinutes >= process.bulkMinutes) errors.push('Add fine sea salt before dividing the dough.')
  if (new Set(process.folds.map((fold) => fold.id)).size !== process.folds.length) errors.push('Each folding step needs a unique identity.')
  let previous = process.saltDelayMinutes
  for (const fold of process.folds) {
    if (fold.atMinutes <= previous || fold.atMinutes >= process.bulkMinutes) {
      errors.push('Schedule folding steps in increasing order after adding fine sea salt and before dividing the dough.')
      break
    }
    previous = fold.atMinutes
  }
  return errors
}

export function sourdoughTimeline(process: SourdoughProcess) {
  return [
    { id: 'mix-levain', kind: 'mix' as const, atMinutes: 0 },
    { id: 'add-salt-and-water', kind: 'salt' as const, atMinutes: process.saltDelayMinutes },
    ...process.folds.map((fold) => ({ ...fold, method: fold.method ?? process.foldMethod, kind: 'fold' as const })),
    { id: 'end-bulk', kind: 'end' as const, atMinutes: process.bulkMinutes },
  ]
}

export const BULK_TEMPERATURE_RANGE_F = [60, 90] as const

/**
 * The Sourdough Journey's bulk fermentation guidelines (thesourdoughjourney.com,
 * "The Mystery of Percentage Rise in Bulk Fermentation"): dough temperature,
 * target end-of-bulk rise and approximate timing for a 20% starter Tartine-style
 * dough followed by a 12–16h retard at 37°F. Warmer dough keeps fermenting
 * longer while it cools in the refrigerator, so it ends bulk at a lower rise.
 */
export const BULK_GUIDELINES = [
  { temperatureF: 65, risePercent: 100, minutes: 960 },
  { temperatureF: 70, risePercent: 75, minutes: 720 },
  { temperatureF: 75, risePercent: 50, minutes: 420 },
  { temperatureF: 80, risePercent: 30, minutes: 330 },
] as const
const GUIDELINE_STARTER_PERCENT = 20

function segment(temperatureF: number) {
  const index = Math.min(Math.max(BULK_GUIDELINES.findIndex((row) => row.temperatureF >= temperatureF), 1), BULK_GUIDELINES.length - 1)
  const upper = index === -1 ? BULK_GUIDELINES.length - 1 : index
  const a = BULK_GUIDELINES[upper - 1], b = BULK_GUIDELINES[upper]
  return { a, b, t: (temperatureF - a.temperatureF) / (b.temperatureF - a.temperatureF) }
}

/** Guideline timing at any temperature: log-linear between rows, extended along the nearest segment. */
function guidelineMinutes(temperatureF: number) {
  const { a, b, t } = segment(temperatureF)
  return Math.exp(Math.log(a.minutes) + (Math.log(b.minutes) - Math.log(a.minutes)) * t)
}

/** Target end-of-bulk volume rise, interpolated and held at the table's ends. */
export function targetRisePercent(temperatureF: number): number {
  const first = BULK_GUIDELINES[0], last = BULK_GUIDELINES[BULK_GUIDELINES.length - 1]
  if (temperatureF <= first.temperatureF) return first.risePercent
  if (temperatureF >= last.temperatureF) return last.risePercent
  const { a, b, t } = segment(temperatureF)
  return Math.round((a.risePercent + (b.risePercent - a.risePercent) * t) / 5) * 5
}

/** Whole bulk fermentation: levain until the shaped dough goes into the refrigerator. */
export const levainToFridgeMinutes = (process: SourdoughProcess) => process.bulkMinutes + (process.benchMinutes ?? 0)

export interface BulkReference { bulkTemperatureF: number; bulkMinutes: number; levainPercent: number }

/**
 * Estimates bulk duration at a temperature. With a known-good reference bake,
 * the guideline curve's shape is scaled to that bake; otherwise the guideline
 * timing is used. Lower inoculation lengthens bulk. A plan, not a readiness test.
 */
export function estimateBulkMinutes(temperatureF: number, levainPercent: number, reference?: BulkReference): number | null {
  if (!Number.isFinite(temperatureF) || !(levainPercent > 0)) return null
  const base = reference && reference.bulkMinutes > 0 && reference.levainPercent > 0 && Number.isFinite(reference.bulkTemperatureF)
    ? { minutes: reference.bulkMinutes * guidelineMinutes(temperatureF) / guidelineMinutes(reference.bulkTemperatureF), levain: reference.levainPercent }
    : { minutes: guidelineMinutes(temperatureF), levain: GUIDELINE_STARTER_PERCENT }
  return Math.max(5, Math.round(base.minutes * Math.sqrt(base.levain / levainPercent) / 5) * 5)
}

/** How much cooler than the reference a bulk must be before a smaller loaf is worth suggesting. */
export const SMALLER_LOAF_BELOW_F = 3

/**
 * Cooler bulks end at a higher rise and fill the same banneton with less dough.
 * Scales a reference piece weight gently (70°F ≈ 94% of a 75°F loaf). Only a
 * significantly cooler bulk shrinks the loaf; warmer bulks never enlarge it.
 */
export function bannetonPieceWeight(referenceGrams: number, referenceTemperatureF: number, temperatureF: number): number {
  if (referenceTemperatureF - temperatureF < SMALLER_LOAF_BELOW_F) return referenceGrams
  const ratio = (1 + targetRisePercent(referenceTemperatureF) / 100) / (1 + targetRisePercent(temperatureF) / 100)
  return Math.round(referenceGrams * ratio ** 0.42 / 5) * 5
}

/** Consecutive folds with one technique and even spacing, the editor's unit of folding. */
export interface FoldGroup { method: SourdoughFoldMethod; count: number; everyMinutes: number; ids: string[] }
export interface FoldPlan { startMinutes: number; groups: FoldGroup[] }

const DEFAULT_FOLD_INTERVAL = 30

/**
 * Reads stored folds as groups without moving any fold. The first fold sits
 * `startMinutes` after salt; each later fold follows the previous one by its
 * group's interval, so irregular schedules become several small groups.
 */
export function foldGroups(process: SourdoughProcess): FoldPlan {
  const folds = process.folds
  if (!folds.length) return { startMinutes: DEFAULT_FOLD_INTERVAL, groups: [] }
  const groups: Array<Omit<FoldGroup, 'everyMinutes'> & { everyMinutes: number | null }> = []
  folds.forEach((fold, index) => {
    const method = fold.method ?? process.foldMethod
    const current = groups.at(-1)
    if (index === 0 || !current) { groups.push({ method, count: 1, everyMinutes: null, ids: [fold.id] }); return }
    const gap = fold.atMinutes - folds[index - 1].atMinutes
    if (current.method === method && (current.everyMinutes === null || current.everyMinutes === gap)) {
      current.everyMinutes = gap
      current.count++
      current.ids.push(fold.id)
    } else groups.push({ method, count: 1, everyMinutes: gap, ids: [fold.id] })
  })
  return {
    startMinutes: folds[0].atMinutes - process.saltDelayMinutes,
    groups: groups.map((group, index) => ({ ...group, everyMinutes: group.everyMinutes ?? groups[index + 1]?.everyMinutes ?? DEFAULT_FOLD_INTERVAL })),
  }
}

/** Expands groups into stored folds, keeping each group's existing fold identities. */
export function foldsFromGroups(saltDelayMinutes: number, plan: FoldPlan, newId: () => string): SourdoughProcess['folds'] {
  const folds: SourdoughProcess['folds'] = []
  let at = saltDelayMinutes + plan.startMinutes
  plan.groups.forEach((group, groupIndex) => {
    for (let index = 0; index < group.count; index++) {
      if (groupIndex > 0 || index > 0) at += group.everyMinutes
      folds.push({ id: group.ids[index] ?? newId(), atMinutes: at, method: group.method })
    }
  })
  return folds
}

/** Reads `90`, `1:30`, `1:30h`, `1h30`, `1h 30m`, `2h` or `45m` as whole minutes. */
export function parseDuration(text: string): number | null {
  const value = text.trim().toLowerCase().replace(/\s+/g, '').replace(/(min|mins|minutes?)$/, 'm').replace(/(hr|hrs|hours?)/, 'h')
  let match: RegExpMatchArray | null
  if (/^\d+$/.test(value)) return Number(value)
  if ((match = value.match(/^(\d+):([0-5]\d)h?$/))) return Number(match[1]) * 60 + Number(match[2])
  if ((match = value.match(/^(\d+)h(?:([0-5]?\d)m?)?$/))) return Number(match[1]) * 60 + Number(match[2] ?? 0)
  if ((match = value.match(/^(\d+)m$/))) return Number(match[1])
  return null
}
