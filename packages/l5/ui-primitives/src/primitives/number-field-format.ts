export type NumberFieldPrecision = 0 | 1 | 2 | 3

/** Display precision must never overwrite the value used by calculations. */
export function formatNumberFieldValue(value: number, decimalPlaces: NumberFieldPrecision = 1) {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'
  return new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: decimalPlaces }).format(value)
}
