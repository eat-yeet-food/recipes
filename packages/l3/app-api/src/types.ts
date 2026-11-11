/**
 * The iOS app API (`/api/public/app/v1`). The single source is ../openapi.yaml:
 * `pnpm app-api:gen` generates ./schema.ts (TypeScript) and the iOS build generates the
 * Swift client from the same file. `pnpm app-api:check` fails when schema.ts is stale.
 * Versioning: add fields freely; renames, removals and meaning changes need `/v2`.
 */
import type { components } from './schema'

type Schemas = components['schemas']
export type AppImageVariant = Schemas['ImageVariant']
export type AppImage = Schemas['Image']
export type AppRecipeSummary = Schemas['RecipeSummary']
export type AppRecipeIndex = Schemas['RecipeIndex']
export type AppItem = Schemas['Item']
export type AppSection = Schemas['Section']
export type AppIngredient = Schemas['Ingredient']
export type AppIngredientSection = Schemas['IngredientSection']
export type AppNeed = Schemas['Need']
export type AppStep = Schemas['Step']
export type AppStepSection = Schemas['StepSection']
export type AppRecipeBlock = Schemas['RecipeBlock']
export type AppRecipe = Schemas['Recipe']
export type AppBatch = Schemas['Batch']
export type AppRecipeDetail = Schemas['RecipeDetail']
export type AppHeading = Schemas['Heading']
export type AppFact = Schemas['Fact']
