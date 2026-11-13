import 'server-only'
import { contentServices } from '@eat-yeet/l4-content-cms/service'
import { cms } from '../cms'

/**
 * How Eat / Yeet recipes are written, distilled from the published Git
 * recipes, plus two of them as worked examples (read live, so they never drift
 * from the site). Served by the `get_style_guide` tool and the `write_recipe`
 * prompt; the server instructions tell models to read it before writing.
 */
export const STYLE_GUIDE = `# Eat / Yeet recipe style

Recipes here read like a cook's own notebook: precise, practical, no filler.

## Before writing
- Read this guide and the examples. Match their voice and structure.
- Ask for the owner's own photo of the finished dish (see Photos). Stock is the last resort.

## Facts
- **title**: the dish's plain name ("Pollo Asado", "Brown Butter Chocolate Chunk Cookies"). No adjectives like "Best" or "Easy".
- **description**: one or two sentences on what makes it good: texture, flavor, the payoff. It is the only intro, shown under the title. Don't add any text above the recipe.
- **times**: honest minutes. totalMinutes includes marinating, resting and chilling; use totalLabel ("Overnight") when minutes would mislead.
- **yield**: a number and a real unit ("4 servings", "14 cookies", "2 loaves").
- **taxonomy**: reuse values from list_categories (snake_case cuisines like "central_american", courses like "mains", "desserts").

## Ingredients
- Amount first, metric weight in grams where it matters: "220g all-purpose flour", "56g dried chipotle morita peppers (about 16)". Spoons for small amounts: "1 tsp kosher salt", "¾ tsp baking soda". Use ½ ¼ ¾ characters.
- Then the ingredient, then prep after a comma: "1 large yellow onion, diced".
- Name sections only when the recipe has real parts ("Marinade", "Chicken", "Dough", "Sauce"); otherwise one untitled section. Plain words, no "&".
- Give every ingredient an id ("flour", "brown-sugar") so steps can reference it.
- A brand or source link is fine when it matters: "230g [72% dark chocolate](https://…)".

## Steps
- One action per step, in order. Lead with a short bold verb phrase, then the detail: "**Soak:** Cover the chipotles with boiling water and soak 30–45 minutes."
- Give cues a cook can see, smell or measure: "until the milk solids turn deep amber and the butter smells nutty — about 5–8 minutes", "until 175°F internal".
- Say why when it prevents a mistake: "no fridge — so the butter cools enough that the eggs don't scramble".
- Every step lists the ingredient ids it uses. If an ingredient is split across steps, every step that uses it gives its amount, and the amounts add up to the ingredient line.
- Temperatures in °F, with °C in parentheses for baking when useful.

## Tips and notes
- Tips are things that change the result: make-ahead, storage, the one technique that matters. Two to four. No "enjoy!".
- Notes are rare: substitutions or sourcing.

## Extra blocks
- Usually none. A markdown story goes after the recipe card, only when there's a real story or background worth reading. Never repeat the description.

## Photos
1. Ask for the owner's own photo of the finished dish. That is the default and the best result.
2. When they share one, offer to clean it up for an elegant food-blog look: tidy or replace the background, surface and props, even out the light. Keep the food exactly as photographed (same food pixels): don't restyle, re-plate, recolor, add or remove food.
3. Show the original and the edited version side by side and wait for the owner to approve before uploading. Upload the approved image with upload_image.
4. Only if the owner has no photo: search_stock_photos, then import_stock_photo. Prefer a natural, overhead or three-quarter shot of the actual dish.
5. Alt text describes the dish as shown ("Charred chicken thighs sliced on a wooden board").
`

const EXAMPLES = ['pollo-asado', 'brown-butter-chocolate-chunk-cookies']

const decode = (text: string) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
/** Published HTML back to the Markdown the tools take. */
const markdown = (html: string) => decode(String(html ?? '')
  .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, (_, href: string, text: string) => '\u005b' + text + '](' + href + ')')
  .replace(/<\/?strong>/g, '**').replace(/<\/?em>/g, '*')
  .replace(/<[^>]+>/g, ''))

const section = (s: any, uses?: boolean) => ({
  title: decode(s.title ?? ''),
  items: s.items.map((html: string, i: number) => ({
    id: s.itemIds[i],
    text: markdown(html),
    ...(uses && s.itemUses?.[i]?.length ? { uses: s.itemUses[i].map((u: any) => u.amount ? u : u.id) } : {}),
  })),
})

/** Two published recipes in create_recipe's input shape. */
export async function styleExamples() {
  const services = contentServices(await cms())
  const examples = []
  for (const slug of EXAMPLES) {
    const { recipe } = await services.recipes.getRecipe({ slug }) as { recipe: any }
    const card = recipe?.blocks?.find((b: any) => b.type === 'recipe')
    if (!card) continue
    examples.push({
      title: recipe.title, description: markdown(recipe.description), category: recipe.category,
      prepMinutes: recipe.prepMinutes, cookMinutes: recipe.cookMinutes, totalMinutes: recipe.totalMinutes,
      ...(recipe.totalLabel ? { totalLabel: recipe.totalLabel } : {}),
      yieldAmount: recipe.yieldAmount, yieldUnit: recipe.yieldUnit,
      courses: recipe.courses, cuisines: recipe.cuisines, methods: recipe.methods, restrictions: recipe.restrictions,
      occasions: recipe.occasions, ingredientTypes: recipe.ingredientTypes,
      equipment: card.equipment.map((s: any) => section(s)),
      ingredients: card.ingredients.map((s: any) => section(s)),
      steps: card.steps.map((s: any) => section(s, true)),
      tips: card.tips.map(markdown), notes: card.notes.map(markdown),
    })
  }
  return examples
}
