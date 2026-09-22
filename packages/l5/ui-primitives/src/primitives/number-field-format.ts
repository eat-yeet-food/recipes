export type NumberFieldPrecision = 0 | 1 | 2 | 3
const formatters = new Map<NumberFieldPrecision, Intl.NumberFormat>()

/** Display precision must never overwrite the value used by calculations. */
export function formatNumberFieldValue(value: number, decimalPlaces: NumberFieldPrecision = 1) {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'
  let formatter = formatters.get(decimalPlaces)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: decimalPlaces })
    formatters.set(decimalPlaces, formatter)
  }
  return formatter.format(value)
}
