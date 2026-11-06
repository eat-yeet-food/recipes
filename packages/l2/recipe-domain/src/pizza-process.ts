export type PizzaMixingMethod = 'spiral' | 'food-processor' | 'hand'

/**
 * A same-day bulk, then a cold ferment and a warm-up on bake day. Bulk counts
 * from when mixing starts, so dividing happens at the same time whichever way
 * the dough is mixed.
 */
export interface PizzaProcess {
  mixingMethod: PizzaMixingMethod
  bulkTemperatureF: number
  /** From the start of mixing until the dough is divided, balled and refrigerated. */
  bulkMinutes: number
  coldDays: number
  /** Out of the refrigerator until the dough reaches room temperature. */
  warmUpMinutes: number
}

/** By hand, the dough rests covered this long before kneading. */
export const HAND_REST_MINUTES = 20
export const COLD_DAYS = [2, 3, 4] as const
export const PIZZA_TEMPERATURE_RANGE_F = [60, 90] as const
/** Longer in the refrigerator, shorter to come up to temperature. */
export const warmUpForColdDays = (days: number) => days <= 2 ? 240 : days === 3 ? 180 : 120
/** A food processor is easiest for one or two dough balls. */
export const FOOD_PROCESSOR_MAX_BALLS = 2

export const DEFAULT_PIZZA_PROCESS: PizzaProcess = { mixingMethod: 'spiral', bulkTemperatureF: 76, bulkMinutes: 60, coldDays: 2, warmUpMinutes: 240 }

export function isPizzaProcess(value: unknown): value is PizzaProcess {
  if (!value || typeof value !== 'object') return false
  const process = value as PizzaProcess
  return ['spiral', 'food-processor', 'hand'].includes(process.mixingMethod) &&
    Number.isFinite(process.bulkTemperatureF) &&
    [process.bulkMinutes, process.coldDays, process.warmUpMinutes].every(Number.isSafeInteger)
}

export function pizzaProcessErrors(process: PizzaProcess): string[] {
  if (!isPizzaProcess(process)) return ['Use whole minutes and days and a supported mixing method.']
  const errors: string[] = []
  const [low, high] = PIZZA_TEMPERATURE_RANGE_F
  if (process.bulkTemperatureF < low || process.bulkTemperatureF > high) errors.push(`Plan bulk fermentation between ${low}°F and ${high}°F.`)
  if (process.mixingMethod === 'hand' && process.bulkMinutes <= HAND_REST_MINUTES) errors.push(`By hand, divide after the ${HAND_REST_MINUTES}m rest and kneading.`)
  if (process.bulkMinutes <= 0) errors.push('Bulk fermentation must be positive.')
  if (!(COLD_DAYS as readonly number[]).includes(process.coldDays)) errors.push('Cold ferment for 2, 3 or 4 days.')
  if (process.warmUpMinutes < 0) errors.push('The warm-up must be zero or greater.')
  return errors
}
