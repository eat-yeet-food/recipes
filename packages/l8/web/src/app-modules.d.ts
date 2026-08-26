declare module '@app/recipes' {
  import type { RecipeService } from '@eat-yeet/l3-api-contract/recipes'
  import type { RecipeQuerySeeds } from '@eat-yeet/l3-api-query/recipes'
  import type { RecipeContent } from '@eat-yeet/l4-content-model/recipes'

  export const recipeStubSeeds: RecipeQuerySeeds
  export const recipeStubService: RecipeService<RecipeContent>
}

declare module '@app/articles' {
  import type { ArticleService } from '@eat-yeet/l3-api-contract/articles'
  import type { ArticleQuerySeeds } from '@eat-yeet/l3-api-query/articles'
  import type { ArticleContent } from '@eat-yeet/l4-content-model/articles'

  export const articleStubSeeds: ArticleQuerySeeds
  export const articleStubService: ArticleService<ArticleContent>
}

declare module '@app/page-blocks' {
  import type { PageBlockRegistry } from '@eat-yeet/l6-ui-content-blocks/page-blocks'
  import type { RecipePageBlockContext } from '@eat-yeet/l7-recipes/recipes/recipe-blocks'

  export const pageBlockRegistry: PageBlockRegistry<RecipePageBlockContext>
}
