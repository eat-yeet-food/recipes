export type NumberFieldPrecision = 0 | 1 | 2 | 3

/** Display precision must never overwrite the value used by calculations. */
export function formatNumberFieldValue(value: number, decimalPlaces: NumberFieldPrecision = 2) {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'
  const rounded = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: decimalPlaces }).format(value)
  // Do not turn a small, nonzero ingredient amount into an apparent zero.
  return Number(rounded) === 0
    ? new Intl.NumberFormat('en-US', { useGrouping: false, maximumSignificantDigits: 2 }).format(value)
    : rounded
}
