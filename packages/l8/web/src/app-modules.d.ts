declare module '@app/recipes' {
  import type { RecipeService } from '@eat-yeet/l3-api-contract/recipes'
  import type { RecipeQuerySeeds } from '@eat-yeet/l3-api-query/recipes'
  import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

  export const recipeStubSeeds: RecipeQuerySeeds
  export const recipeStubService: RecipeService<RecipeContent>
}

declare module '@app/page-blocks' {
  import type { PageBlockRegistry, RecipePageBlockContext } from '@eat-yeet/l6-ui-content-blocks/page-blocks'

  export const pageBlockRegistry: PageBlockRegistry<RecipePageBlockContext>
}
