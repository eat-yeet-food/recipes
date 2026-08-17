import { useEffect, useRef, useState } from 'react'

import { Icon } from './icons'
import { RecipeCard } from './layout'
import { humanizeMinutes, formatYield, labelize } from '../lib/format'
import { INDEX, imageUrl, type Recipe, type RecipeSummary, type Section } from '../lib/recipes'
import { SITE_URL } from '../../site.config.mjs'

const Html = ({ as: Tag = 'span', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />
)

function sectionItems(sections: Section[]) {
  return sections.flatMap((section) => section.items)
}

function MetaList({ recipe }: { recipe: Recipe }) {
  const items = [
    ['Prep Time', humanizeMinutes(recipe.prepMinutes)],
    ['Cook Time', humanizeMinutes(recipe.cookMinutes)],
    ['Total Time', humanizeMinutes(recipe.totalMinutes)],
    ['Yield', formatYield(recipe.yieldAmount, recipe.yieldUnit)],
  ].filter(([, value]) => value)

  return (
    <dl className="bb-trial-meta-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RecipeList({ sections, ordered = false }: { sections: Section[]; ordered?: boolean }) {
  if (sections.length === 0) return null
  const List = ordered ? 'ol' : 'ul'

  return (
    <div className="bb-trial-section-group">
      {sections.map((section, index) => (
        <section key={index}>
          {section.title && <h4>{section.title}</h4>}
          <List>
            {section.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Html html={item} />
              </li>
            ))}
          </List>
        </section>
      ))}
    </div>
  )
}

function FlatList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  if (items.length === 0) return null
  const List = ordered ? 'ol' : 'ul'

  return (
    <List>
      {items.map((item, index) => (
        <li key={index}>
          <Html html={item} />
        </li>
      ))}
    </List>
  )
}

function BrowseRecipesAside({ currentRecipe }: { currentRecipe: Recipe }) {
  const recipes = INDEX.filter((candidate) => candidate.slug !== currentRecipe.slug).slice(0, 4)

  if (recipes.length === 0) return null

  return (
    <aside data-bb-trial-browse="" aria-label="Browse recipes">
      <div data-bb-trial-browse-heading="">
        <span>Browse</span>
        {' '}
        <strong>Recipes</strong>
      </div>
      <div data-bb-trial-browse-grid="">
        {recipes.map((recipe: RecipeSummary) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
      </div>
    </aside>
  )
}

type ScreenWakeLockSentinel = {
  released?: boolean
  release: () => Promise<void>
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<ScreenWakeLockSentinel>
  }
}

export function ButternutRecipeTrial({
  recipe,
  showOriginalLink = true,
}: {
  recipe: Recipe
  showOriginalLink?: boolean
}) {
  const [cookMode, setCookMode] = useState(false)
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null)
  const photo = imageUrl(recipe)
  const category = recipe.category ? labelize(recipe.category) : 'Recipe'
  const courses = recipe.courses.map(labelize).join(' / ')
  const heroAlt = `${recipe.title} hero image`
  const crumbCourse = recipe.courses[0] ? labelize(recipe.courses[0]) : category
  const recipeUrl = `${SITE_URL}/recipes/${recipe.slug}`
  const pinUrl = new URL('https://www.pinterest.com/pin/create/button/')
  pinUrl.searchParams.set('url', recipeUrl)
  pinUrl.searchParams.set('description', recipe.title)
  if (photo) pinUrl.searchParams.set('media', `${SITE_URL}${photo}`)

  useEffect(() => {
    if (!cookMode) return

    let cancelled = false

    async function requestWakeLock() {
      const wakeLock = (navigator as WakeLockNavigator).wakeLock
      if (!wakeLock || document.visibilityState !== 'visible') return

      try {
        wakeLockRef.current = await wakeLock.request('screen')
        if (cancelled) {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
        }
      } catch {
        wakeLockRef.current = null
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === 'visible' &&
        (!wakeLockRef.current || wakeLockRef.current.released)
      ) {
        void requestWakeLock()
      }
    }

    void requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      const wakeLock = wakeLockRef.current
      wakeLockRef.current = null
      void wakeLock?.release().catch(() => {})
    }
  }, [cookMode])

  const printRecipe = () => {
    window.print()
  }

  return (
    <div className={`bb-trial${cookMode ? ' bb-trial-cook' : ''}`}>
      <header className="bb-trial-hero">
        <div className="bb-trial-hero-copy">
          <nav className="bb-trial-crumbs" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span>&gt;</span>
            <a href="/search">Recipes</a>
            <span>&gt;</span>
            <span>{crumbCourse}</span>
            <span>&gt;</span>
            <span>{recipe.title}</span>
          </nav>
          <h1>{recipe.title}</h1>
          <div className="bb-trial-byline">
            <span>By Patrick Hogan</span>
            {courses && <span>{courses}</span>}
          </div>
          <div className="bb-trial-rating" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }, (_, index) => (
              <Icon key={index} name="star" className="bb-trial-star" strokeWidth={0} />
            ))}
          </div>
          <div className="bb-trial-actions" aria-label="Recipe actions">
            <a href={pinUrl.toString()} target="_blank" rel="noreferrer">
              <Icon name="share" />
              Pin Recipe
            </a>
            <button type="button" onClick={printRecipe}>
              <Icon name="printer" />
              Print Recipe
            </button>
            <button type="button" aria-pressed={cookMode} onClick={() => setCookMode((active) => !active)}>
              <Icon name="book" />
              Cook Mode
            </button>
            <a href="#trial-recipe-card">Jump to Recipe</a>
          </div>
          {recipe.description && <p className="bb-trial-dek">{recipe.description}</p>}
        </div>
      </header>

      {photo && (
        <figure className="bb-trial-photo">
          <img src={photo} alt={heroAlt} />
        </figure>
      )}

      <main className="bb-trial-shell">
        <aside className="bb-trial-social" aria-label="Share">
          <button type="button" onClick={printRecipe}>Print</button>
          <a href={pinUrl.toString()} target="_blank" rel="noreferrer">Pin</a>
          {showOriginalLink && <a href={`/recipes/${recipe.slug}`}>Original</a>}
        </aside>

        <article id="trial-recipe-card" className="bb-trial-card" aria-label={`${recipe.title} recipe card`}>
          <div className="bb-trial-card-head">
            <p className="bb-trial-kicker">Recipe</p>
            <h2>{recipe.title}</h2>
            {recipe.description && <p>{recipe.description}</p>}
            <MetaList recipe={recipe} />
            <div className="bb-trial-card-actions" aria-label="Recipe card actions">
              <button type="button" onClick={printRecipe}>
                <Icon name="printer" />
                Print Recipe
              </button>
              <a href={pinUrl.toString()} target="_blank" rel="noreferrer">
                <Icon name="share" />
                Pin Recipe
              </a>
              <button type="button" aria-pressed={cookMode} onClick={() => setCookMode((active) => !active)}>
                <Icon name="book" />
                Cook Mode
              </button>
            </div>
          </div>

          <section>
            <h3>Ingredients</h3>
            <RecipeList sections={recipe.ingredients} />
          </section>

          <section>
            <h3>Instructions</h3>
            <RecipeList sections={recipe.steps} ordered />
          </section>

          {recipe.equipment.length > 0 && (
            <section>
              <h3>Equipment</h3>
              <RecipeList sections={recipe.equipment} />
            </section>
          )}

          {(recipe.notes.length > 0 || recipe.tips.length > 0) && (
            <section>
              <h3>Notes</h3>
              <FlatList items={[...recipe.notes, ...recipe.tips]} />
            </section>
          )}
        </article>
        <BrowseRecipesAside currentRecipe={recipe} />
      </main>

      {showOriginalLink && (
        <footer className="bb-trial-footer">
          <a href={`/recipes/${recipe.slug}`}>Back to the current recipe page</a>
          <span>{sectionItems(recipe.ingredients).length} ingredients</span>
        </footer>
      )}
    </div>
  )
}
