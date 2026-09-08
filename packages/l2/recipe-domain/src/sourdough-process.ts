export type SourdoughFoldMethod = 'stretch-and-fold' | 'coil-fold' | 'lamination'

export interface SourdoughProcess {
  mixingMethod: 'hand' | 'spiral'
  /** Fallback for saved formulas and shared links created before per-step techniques. */
  foldMethod: 'stretch-and-fold' | 'coil-fold'
  autolyseMinutes: number
  saltDelayMinutes: number
  bulkMinutes: number
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
    [process.autolyseMinutes, process.saltDelayMinutes, process.bulkMinutes].every(Number.isSafeInteger) &&
    Array.isArray(process.folds) && process.folds.every((fold) => fold && typeof fold.id === 'string' && Number.isSafeInteger(fold.atMinutes) &&
      (fold.method === undefined || fold.method === 'stretch-and-fold' || fold.method === 'coil-fold' || fold.method === 'lamination'))
}

export function sourdoughProcessErrors(process: SourdoughProcess): string[] {
  if (!isSourdoughProcess(process)) return ['Use whole minutes and a supported mixing and folding method.']
  const errors: string[] = []
  if (process.autolyseMinutes < 0 || process.saltDelayMinutes < 0 || process.bulkMinutes <= 0) errors.push('Rest times must be zero or greater; bulk fermentation must be positive.')
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
