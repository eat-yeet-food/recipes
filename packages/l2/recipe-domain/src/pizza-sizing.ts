export interface PizzaSizing {
  referenceDiameterInches: number
  referenceBallWeightGrams: number
  diametersInches: number[]
}

export function isPizzaSizing(value: unknown): value is PizzaSizing {
  if (!value || typeof value !== 'object') return false
  const sizing = value as PizzaSizing
  return [sizing.referenceDiameterInches, sizing.referenceBallWeightGrams].every((number) => Number.isFinite(number) && number > 0) &&
    Array.isArray(sizing.diametersInches) && sizing.diametersInches.length > 0 &&
    sizing.diametersInches.every((number) => Number.isFinite(number) && number > 0) && new Set(sizing.diametersInches).size === sizing.diametersInches.length
}

/** Preserve the authored dough thickness by scaling the pizza's area. */
export function pizzaAreaScale(diameterInches: number, sizing: PizzaSizing) {
  if (!Number.isFinite(diameterInches) || diameterInches <= 0 || !isPizzaSizing(sizing)) throw new Error('Pizza sizes and reference weight must be positive.')
  return (diameterInches / sizing.referenceDiameterInches) ** 2
}

export function pizzaBallWeight(diameterInches: number, sizing: PizzaSizing) {
  return Math.round(sizing.referenceBallWeightGrams * pizzaAreaScale(diameterInches, sizing))
}
