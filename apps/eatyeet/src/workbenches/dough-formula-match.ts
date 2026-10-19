import type { DoughFormula } from '@eat-yeet/l2-recipe-domain/formula'
import { completeFormula } from './dough-workbench-model'

const formulaKey = (formula: DoughFormula) => {
  const complete = completeFormula(formula)
  const process = complete.process
  const comparable = { ...complete, ...(process ? { process: { ...process, foldMethod: undefined, folds: process.folds.map(({ atMinutes, method }) => ({ atMinutes, method: method ?? process.foldMethod })) } } : {}) }
  return JSON.stringify(comparable, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) : value)
}
/** Formulas match by value: key order, fold row IDs and inherited fold techniques are ignored. */
export const formulasMatch = (left: DoughFormula, right: DoughFormula) => formulaKey(left) === formulaKey(right)
