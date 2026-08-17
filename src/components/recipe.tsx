import { ButternutRecipeTrial } from './recipe-butternut-trial'
import type { Recipe } from '../lib/recipes'

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  return <ButternutRecipeTrial recipe={recipe} showOriginalLink={false} />
}
