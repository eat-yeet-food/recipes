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
    [process.autolyseMinutes, process.saltDelayMinutes, process.bulkMinutes].every(Number.isSafeInteger) &&
    Array.isArray(process.folds) && process.folds.every((fold) => fold && typeof fold.id === 'string' && Number.isSafeInteger(fold.atMinutes) &&
      (fold.method === undefined || fold.method === 'stretch-and-fold' || fold.method === 'coil-fold' || fold.method === 'lamination'))
}

export function sourdoughProcessErrors(process: SourdoughProcess): string[] {
  if (!isSourdoughProcess(process)) return ['Use whole minutes and a supported mixing and folding method.']
  const errors: string[] = []
  if (process.autolyseMinutes < 0 || process.saltDelayMinutes < 0 || process.bulkMinutes <= 0) errors.push('Rest times must be zero or greater; bulk fermentation must be positive.')
  if (process.bulkTemperatureF != null && (process.bulkTemperatureF < BULK_TEMPERATURE_RANGE_F[0] || process.bulkTemperatureF > BULK_TEMPERATURE_RANGE_F[1])) errors.push(`Plan bulk fermentation between ${BULK_TEMPERATURE_RANGE_F[0]}°F and ${BULK_TEMPERATURE_RANGE_F[1]}°F.`)
  if (process.saltDelayMinutes >= process.bulkMinutes) errors.push('Add fine sea salt before the end of bulk fermentation.')
  if (new Set(process.folds.map((fold) => fold.id)).size !== process.folds.length) errors.push('Each folding step needs a unique identity.')
  let previous = process.saltDelayMinutes
  for (const fold of process.folds) {
    if (fold.atMinutes <= previous || fold.atMinutes >= process.bulkMinutes) {
      errors.push('Schedule folding steps in increasing order after adding fine sea salt and before bulk fermentation ends.')
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

/**
 * Cooler bulks end at a higher rise and fill the same banneton with less dough.
 * Scales a reference piece weight gently (70°F ≈ 94% of a 75°F loaf).
 */
export function bannetonPieceWeight(referenceGrams: number, referenceTemperatureF: number, temperatureF: number): number {
  if (targetRisePercent(referenceTemperatureF) === targetRisePercent(temperatureF)) return referenceGrams
  const ratio = (1 + targetRisePercent(referenceTemperatureF) / 100) / (1 + targetRisePercent(temperatureF) / 100)
  return Math.round(referenceGrams * ratio ** 0.42 / 5) * 5
}
