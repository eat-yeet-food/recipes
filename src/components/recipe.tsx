/**
 * Recipe detail, from:
 *   containers/recipe-detail-container.tsx
 *   components/recipe-detail-image-carousel.tsx  (SingleHero)
 *   components/recipe-metadata.tsx
 *   components/recipe-ingredients.tsx
 *   components/recipe-instructions.tsx
 *   components/recipe-equipment.tsx
 *   components/recipe-tips.tsx
 *   components/recipe-section-title.tsx
 *
 * Item strings are HTML rendered from markdown at build time, standing in for
 * the original's <InlineMarkdown>, so they are injected rather than escaped.
 */

import { Icon } from './icons'
import { humanizeMinutes, formatYield, labelize } from '../lib/format'
import { imageUrl, type Recipe, type Section } from '../lib/recipes'

const HERO_GRADIENT =
  'linear-gradient(180deg, rgba(45,45,45,0.55) 0%, rgba(45,45,45,0.1) 25%, transparent 50%, rgba(45,45,45,0.4) 100%)'

/** Build-time-rendered markdown. */
const Html = ({ as: Tag = 'span', html, ...rest }: { as?: any; html: string } & Record<string, unknown>) => (
  <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />
)

/** recipe-section-title.tsx */
function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-6 flex items-center gap-4 font-display text-[28px] font-extrabold text-charcoal print:mb-2 print:text-[16pt] print:block">
      {children}
      <span className="h-px flex-1 bg-peach-deep print:hidden" aria-hidden="true" />
    </h2>
  )
}

/** SingleHero — also the zero-image case, which falls back to the icon. */
function RecipeHero({ recipe }: { recipe: Recipe }) {
  const src = imageUrl(recipe)
  return (
    <div className="-mt-16 relative h-[55vh] min-h-[380px] max-h-[560px] w-full overflow-hidden print:hidden">
      {src ? (
        <div className="absolute inset-0 bg-charcoal/5">
          <img
            src={src}
            alt={recipe.title}
            width="1920"
            height="1080"
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-charcoal/5 flex items-center justify-center">
          <Icon name="utensils-crossed" className="size-16 text-charcoal/15" strokeWidth="1" />
        </div>
      )}
      <div className="absolute inset-0 print:hidden" style={{ background: HERO_GRADIENT }} />
    </div>
  )
}

/** recipe-metadata.tsx */
function Metadata({ recipe }: { recipe: Recipe }) {
  const items = [
    { label: 'Prep Time', value: humanizeMinutes(recipe.prepMinutes) },
    { label: 'Cook Time', value: humanizeMinutes(recipe.cookMinutes) },
    { label: 'Total Time', value: humanizeMinutes(recipe.totalMinutes) },
    { label: 'Yield', value: formatYield(recipe.yieldAmount, recipe.yieldUnit) },
  ].filter((item) => item.value !== '')

  if (items.length === 0) return null

  return (
    <div className="mt-8">
      <div className="border-y border-border-light flex flex-col sm:flex-row print:flex-row print:py-1">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`flex flex-1 flex-col items-center justify-center px-4 py-4${
              i < items.length - 1
                ? ' border-b border-border-light sm:border-b-0 sm:border-r sm:border-border-light'
                : ''
            } print:py-1 print:px-2`}
          >
            <span className="text-[10px] uppercase tracking-[2px] text-charcoal/65">
              {item.label}
            </span>
            <span className="mt-1 font-body text-base font-bold text-charcoal">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** recipe-ingredients.tsx */
function Ingredients({ sections }: { sections: Section[] }) {
  if (sections.length === 0) return null
  const multiple = sections.length > 1

  return (
    <section aria-label="Ingredients">
      <SectionTitle>Ingredients</SectionTitle>
      {sections.map((section, idx) => (
        <div key={idx}>
          {multiple && section.title && (
            <h3
              className={`mb-3.5 border-b border-border-light pb-1.5 font-display text-[19px] font-extrabold text-charcoal${idx > 0 ? ' mt-7' : ''}`}
            >
              {section.title}
            </h3>
          )}
          <ul role="list" className="m-0 list-none p-0">
            {section.items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 border-b border-dashed border-border-light py-2.5 font-body text-[16px] font-medium leading-[1.6] text-charcoal last:border-b-0 print:py-1 print:text-[10pt] print:leading-[1.3] print:gap-2"
              >
                <span
                  className="mt-[9px] size-1.5 shrink-0 rounded-full bg-gold print:mt-[7px] print:bg-black"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <Html html={item} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

/** recipe-instructions.tsx */
function Instructions({ sections }: { sections: Section[] }) {
  if (sections.length === 0) return null
  const multiple = sections.length > 1

  return (
    <section aria-label="Instructions">
      <SectionTitle>Instructions</SectionTitle>
      <div className="flex flex-col gap-12">
        {sections.map((section, idx) => (
          <div key={idx}>
            {multiple && section.title && (
              <h3 className="mb-5 border-b border-border-light pb-2 font-display text-[19px] font-extrabold text-charcoal">
                {section.title}
              </h3>
            )}
            <ol role="list" className="flex list-none flex-col gap-6 p-0">
              {section.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-5 border-b border-border-light pb-6 last:border-b-0 last:pb-0 print:gap-3 print:pb-2 print:border-b-0"
                >
                  <span
                    className="min-w-[40px] shrink-0 text-right font-display text-[28px] font-extrabold leading-none text-charcoal print:min-w-[24px] print:text-[12pt]"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <Html
                      as="p"
                      html={item}
                      className="font-body text-[17px] font-medium leading-[1.75] text-charcoal print:text-[11pt] print:leading-[1.4]"
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}

/** recipe-equipment.tsx */
const EQUIPMENT_ITEM =
  'inline-flex items-center rounded-[var(--radius-md)] border border-border-light bg-white px-3.5 py-2 text-[13px] font-medium text-charcoal transition-colors duration-200 hover:border-border-medium hover:shadow-sm print:rounded-none print:border-0 print:px-0 print:py-0.5 print:text-xs'

function Equipment({ sections }: { sections: Section[] }) {
  if (sections.length === 0) return null
  const multiple = sections.length > 1

  return (
    <section aria-label="Equipment">
      <SectionTitle>Equipment</SectionTitle>
      {sections.map((section, idx) => (
        <div key={idx}>
          {multiple && section.title && (
            <h3 className="mt-7 mb-3.5 border-b border-border-light pb-1.5 font-display text-[19px] font-extrabold text-charcoal first:mt-0">
              {section.title}
            </h3>
          )}
          <div className="flex flex-wrap gap-2">
            {section.items.map((item, i) => (
              <Html key={i} as="div" html={item} className={EQUIPMENT_ITEM} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

/** recipe-tips.tsx — numbered tips, then a Notes subsection. */
function NumberedList({ items }: { items: string[] }) {
  return (
    <ol role="list" className="m-0 list-none p-0">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-baseline gap-5 border-b border-border-light mb-6 pb-6 last:border-b-0 last:mb-0 last:pb-0 print:gap-3 print:pb-2 print:mb-2 print:border-b-0"
        >
          <span
            className="min-w-[40px] shrink-0 text-right font-display text-[28px] font-extrabold leading-none text-charcoal print:min-w-[24px] print:text-[12pt]"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <Html
            as="p"
            html={item}
            className="flex-1 font-body text-[17px] font-medium leading-[1.75] text-charcoal print:text-[11pt] print:leading-[1.4]"
          />
        </li>
      ))}
    </ol>
  )
}

function Tips({ tips, notes }: { tips: string[]; notes: string[] }) {
  if (tips.length === 0 && notes.length === 0) return null

  return (
    <section aria-label="Tips &amp; Notes">
      <SectionTitle>Tips &amp; Notes</SectionTitle>
      {tips.length > 0 && <NumberedList items={tips} />}
      {notes.length > 0 && (
        <div className={tips.length > 0 ? 'mt-8' : undefined}>
          <h3 className="mt-9 mb-5 border-b border-border-light pb-2 font-display text-[19px] font-extrabold text-charcoal first:mt-0 print:mt-4 print:mb-2 print:text-[12pt]">
            Notes
          </h3>
          <NumberedList items={notes} />
        </div>
      )}
    </section>
  )
}

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const categoryLabel = recipe.category ? labelize(recipe.category) : ''

  return (
    <>
      <RecipeHero recipe={recipe} />
      <div className="recipe-rich">
        <div className="-mt-12 relative z-10 mx-auto rounded-t-[var(--radius-xl)] bg-white px-8 py-10 shadow-lg max-w-[var(--max-width-narrow)] max-sm:mx-4 max-sm:px-6 max-sm:py-8 print:mt-0 print:px-0 print:py-4 print:rounded-none print:shadow-none print:border-b print:border-b-charcoal/30">
          <div className="mb-4 flex items-center justify-between">
            <nav
              aria-label="Breadcrumb"
              className="text-[11px] font-semibold uppercase tracking-[2px] text-charcoal/65"
            >
              <span>EAT/YEET</span>
              {categoryLabel && (
                <>
                  <span className="mx-2">&gt;</span>
                  <span>{categoryLabel}</span>
                </>
              )}
            </nav>
          </div>
          <h1 className="font-display text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] text-charcoal">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-4 font-body text-[17px] font-medium leading-[1.75] text-charcoal">
              {recipe.description}
            </p>
          )}
          <Metadata recipe={recipe} />
        </div>

        <div className="mx-auto max-w-[var(--max-width-narrow)] px-8 py-12 max-sm:px-4 md:max-w-[960px] md:grid md:grid-cols-[340px_1fr] md:items-start md:gap-12 print:block print:px-0 print:py-4 print:max-w-none">
          <div className="md:sticky md:top-24 print:static print:mb-6">
            <Ingredients sections={recipe.ingredients} />
          </div>
          <div>
            <Instructions sections={recipe.steps} />
          </div>
        </div>

        <div className="mx-auto max-w-[var(--max-width-narrow)] space-y-12 px-8 pb-12 max-sm:px-4 md:max-w-[960px] print:space-y-4 print:px-0 print:pb-4 print:max-w-none">
          <Equipment sections={recipe.equipment} />
          <Tips tips={recipe.tips} notes={recipe.notes} />
        </div>
      </div>
    </>
  )
}
