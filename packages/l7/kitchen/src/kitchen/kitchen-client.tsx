/** A member's formula as listed in the library. `state` is the plugin's opaque configuration. */
export type KitchenFormulaSummary = {
  id: string
  name: string
  recipeSlug: string
  family: string
  state: unknown
  revision: number
  updatedAt: string
  deletedAt: string | null
}
export type KitchenRevision = { id: string; name: string; state: unknown; notes: string; createdAt: string; updatedAt: string }
export type KitchenFormula = KitchenFormulaSummary & { notes: string; revisions: KitchenRevision[] }
export type KitchenList = { formulas: KitchenFormulaSummary[]; deleted: KitchenFormulaSummary[] }
export type KitchenErrorCode = 'not-found' | 'invalid' | 'name-taken' | 'conflict' | 'limit'

/** Failures carry the server's message, HTTP status and, where useful, a code. */
export class KitchenError extends Error {
  constructor(message: string, readonly status: number, readonly code?: KitchenErrorCode) {
    super(message)
  }
}
export const kitchenErrorCode = (error: unknown) => error instanceof KitchenError ? error.code : undefined
export const kitchenErrorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback

/** Transport supplied by the page; Storybook supplies an in-memory fixture. */
export type KitchenClient = {
  list: () => Promise<KitchenList>
  read: (id: string) => Promise<KitchenFormula>
  create: (input: { recipeSlug: string; name: string; state: unknown; notes: string }) => Promise<KitchenFormula>
  save: (id: string, input: { baseRevision: number; name: string; state: unknown; notes: string }) => Promise<KitchenFormula>
  restore: (id: string, revisionId: string) => Promise<KitchenFormula>
  duplicate: (id: string, name: string) => Promise<KitchenFormula>
  remove: (id: string) => Promise<KitchenFormulaSummary>
  undelete: (id: string) => Promise<KitchenFormula>
}

export const cleanFormulaName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ')
/** Mirrors the server's rules so the dialog can explain problems before submitting. */
export function formulaNameError(value: string) {
  const name = cleanFormulaName(value)
  if (!name) return 'Enter a name for this formula.'
  if (name.length > 80) return 'Use 80 characters or fewer.'
  return ''
}
