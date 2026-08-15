/**
 * Recipe detail, transcribed from:
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
 * the original's <InlineMarkdown>.
 */

import { escapeHtml, humanizeMinutes, formatYield, labelize } from '../format.js'
import { icon } from '../icons.js'

const HERO_GRADIENT =
  'linear-gradient(180deg, rgba(45,45,45,0.55) 0%, rgba(45,45,45,0.1) 25%, transparent 50%, rgba(45,45,45,0.4) 100%)'

/** recipe-section-title.tsx */
function sectionTitle(text) {
  return `<h2 class="mb-6 flex items-center gap-4 font-display text-[28px] font-extrabold text-charcoal print:mb-2 print:text-[16pt] print:block">${escapeHtml(text)}<span class="h-px flex-1 bg-peach-deep print:hidden" aria-hidden="true"></span></h2>`
}

/** SingleHero — also the zero-image case, which falls back to the icon. */
function renderRecipeHero(recipe) {
  const media = recipe.imageUrl
    ? `<div class="absolute inset-0 bg-charcoal/5"><img src="${recipe.imageUrl}" alt="${escapeHtml(recipe.imageAlt ?? '')}" width="1920" height="1080" sizes="100vw" class="absolute inset-0 h-full w-full object-cover"></div>`
    : `<div class="absolute inset-0 bg-charcoal/5 flex items-center justify-center">${icon('utensils-crossed', 'size-16 text-charcoal/15', '1')}</div>`

  return `<div class="-mt-16 relative h-[55vh] min-h-[380px] max-h-[560px] w-full overflow-hidden print:hidden">
      ${media}
      <div class="absolute inset-0 print:hidden" style="background: ${HERO_GRADIENT}"></div>
    </div>`
}

/** recipe-metadata.tsx */
function renderMetadata(recipe) {
  const items = [
    { label: 'Prep Time', value: humanizeMinutes(recipe.prepMinutes) },
    { label: 'Cook Time', value: humanizeMinutes(recipe.cookMinutes) },
    { label: 'Total Time', value: humanizeMinutes(recipe.totalMinutes) },
    { label: 'Yield', value: formatYield(recipe.yieldAmount, recipe.yieldUnit) },
  ].filter((item) => item.value !== '')

  if (items.length === 0) return ''

  const cells = items
    .map((item, i) => {
      const divider =
        i < items.length - 1
          ? ' border-b border-border-light sm:border-b-0 sm:border-r sm:border-border-light'
          : ''
      return `<div class="flex flex-1 flex-col items-center justify-center px-4 py-4${divider} print:py-1 print:px-2">
          <span class="text-[10px] uppercase tracking-[2px] text-charcoal/65">${escapeHtml(item.label)}</span>
          <span class="mt-1 font-body text-base font-bold text-charcoal">${escapeHtml(item.value)}</span>
        </div>`
    })
    .join('')

  return `<div class="mt-8"><div class="border-y border-border-light flex flex-col sm:flex-row print:flex-row print:py-1">${cells}</div></div>`
}

/** recipe-ingredients.tsx */
function renderIngredients(sections) {
  if (sections.length === 0) return ''
  const multiple = sections.length > 1

  const blocks = sections
    .map((section, idx) => {
      const heading =
        multiple && section.title
          ? `<h3 class="mb-3.5 border-b border-border-light pb-1.5 font-display text-[19px] font-extrabold text-charcoal${idx > 0 ? ' mt-7' : ''}">${escapeHtml(section.title)}</h3>`
          : ''
      const items = section.items
        .map(
          (item) =>
            `<li class="flex items-start gap-3 border-b border-dashed border-border-light py-2.5 font-body text-[16px] font-medium leading-[1.6] text-charcoal last:border-b-0 print:py-1 print:text-[10pt] print:leading-[1.3] print:gap-2">
              <span class="mt-[9px] size-1.5 shrink-0 rounded-full bg-gold print:mt-[7px] print:bg-black" aria-hidden="true"></span>
              <div class="min-w-0 flex-1"><span>${item}</span></div>
            </li>`,
        )
        .join('')
      return `<div>${heading}<ul role="list" class="m-0 list-none p-0">${items}</ul></div>`
    })
    .join('')

  return `<section aria-label="Ingredients">${sectionTitle('Ingredients')}${blocks}</section>`
}

/** recipe-instructions.tsx */
function renderInstructions(sections) {
  if (sections.length === 0) return ''
  const multiple = sections.length > 1

  const blocks = sections
    .map((section) => {
      const heading =
        multiple && section.title
          ? `<h3 class="mb-5 border-b border-border-light pb-2 font-display text-[19px] font-extrabold text-charcoal">${escapeHtml(section.title)}</h3>`
          : ''
      const items = section.items
        .map(
          (item, i) =>
            `<li class="flex items-baseline gap-5 border-b border-border-light pb-6 last:border-b-0 last:pb-0 print:gap-3 print:pb-2 print:border-b-0">
              <span class="min-w-[40px] shrink-0 text-right font-display text-[28px] font-extrabold leading-none text-gradient-cta opacity-60 print:text-charcoal print:[background:none] print:[-webkit-text-fill-color:unset] print:opacity-100 print:min-w-[24px] print:text-[12pt]" aria-hidden="true">${i + 1}</span>
              <div class="flex-1"><p class="font-body text-[17px] font-medium leading-[1.75] text-charcoal print:text-[11pt] print:leading-[1.4]">${item}</p></div>
            </li>`,
        )
        .join('')
      return `<div>${heading}<ol role="list" class="flex list-none flex-col gap-6 p-0">${items}</ol></div>`
    })
    .join('')

  return `<section aria-label="Instructions">${sectionTitle('Instructions')}<div class="flex flex-col gap-12">${blocks}</div></section>`
}

/** recipe-equipment.tsx */
const EQUIPMENT_ITEM =
  'inline-flex items-center rounded-[var(--radius-md)] border border-border-light bg-white px-3.5 py-2 text-[13px] font-medium text-charcoal transition-colors duration-200 hover:border-border-medium hover:shadow-sm print:rounded-none print:border-0 print:px-0 print:py-0.5 print:text-xs'

function renderEquipment(sections) {
  if (sections.length === 0) return ''
  const multiple = sections.length > 1

  const blocks = sections
    .map((section) => {
      const heading =
        multiple && section.title
          ? `<h3 class="mt-7 mb-3.5 border-b border-border-light pb-1.5 font-display text-[19px] font-extrabold text-charcoal first:mt-0">${escapeHtml(section.title)}</h3>`
          : ''
      const items = section.items
        .map((item) => `<div class="${EQUIPMENT_ITEM}">${item}</div>`)
        .join('')
      return `<div>${heading}<div class="flex flex-wrap gap-2">${items}</div></div>`
    })
    .join('')

  return `<section aria-label="Equipment">${sectionTitle('Equipment')}${blocks}</section>`
}

/** recipe-tips.tsx — numbered tips, then a Notes subsection. */
function numberedList(items) {
  const rows = items
    .map(
      (item, i) =>
        `<li class="flex items-baseline gap-5 border-b border-border-light mb-6 pb-6 last:border-b-0 last:mb-0 last:pb-0 print:gap-3 print:pb-2 print:mb-2 print:border-b-0">
          <span class="min-w-[40px] shrink-0 text-right font-display text-[28px] font-extrabold leading-none text-gradient-cta opacity-60 print:min-w-[24px] print:text-[12pt]" aria-hidden="true">${i + 1}</span>
          <p class="flex-1 font-body text-[17px] font-medium leading-[1.75] text-charcoal print:text-[11pt] print:leading-[1.4]">${item}</p>
        </li>`,
    )
    .join('')
  return `<ol role="list" class="m-0 list-none p-0">${rows}</ol>`
}

function renderTips(tips, notes) {
  if (tips.length === 0 && notes.length === 0) return ''

  const notesBlock =
    notes.length > 0
      ? `<div${tips.length > 0 ? ' class="mt-8"' : ''}>
          <h3 class="mt-9 mb-5 border-b border-border-light pb-2 font-display text-[19px] font-extrabold text-charcoal first:mt-0 print:mt-4 print:mb-2 print:text-[12pt]">Notes</h3>
          ${numberedList(notes)}
        </div>`
      : ''

  return `<section aria-label="Tips &amp; Notes">${sectionTitle('Tips & Notes')}${tips.length > 0 ? numberedList(tips) : ''}${notesBlock}</section>`
}

export function renderRecipe(recipes, slug) {
  const recipe = recipes.find((r) => r.slug === slug)
  if (!recipe) {
    return `<div class="mx-auto max-w-[var(--max-width-narrow)] px-8 pt-24 pb-20 text-center">
        <p class="text-lg text-charcoal/65">Recipe not found.</p>
        <p class="mt-2 text-sm text-charcoal/65"><a href="#/" class="text-pink hover:text-pink-dark">Back to home</a></p>
      </div>`
  }

  const categoryLabel = recipe.category ? labelize(recipe.category) : ''

  return `${renderRecipeHero(recipe)}
    <div>
      <div class="-mt-12 relative z-10 mx-auto rounded-t-[var(--radius-xl)] bg-white px-8 py-10 shadow-lg max-w-[var(--max-width-narrow)] max-sm:mx-4 max-sm:px-6 max-sm:py-8 print:mt-0 print:px-0 print:py-4 print:rounded-none print:shadow-none print:border-b print:border-b-charcoal/30">
        <div class="mb-4 flex items-center justify-between">
          <nav aria-label="Breadcrumb" class="text-[11px] font-semibold uppercase tracking-[2px] text-charcoal/65">
            <span>EAT/YEET</span>${categoryLabel ? `<span class="mx-2">&gt;</span><span>${escapeHtml(categoryLabel)}</span>` : ''}
          </nav>
        </div>
        <h1 class="font-display text-[clamp(30px,4vw,44px)] font-extrabold leading-[1.1] text-charcoal">${escapeHtml(recipe.title)}</h1>
        ${recipe.description ? `<p class="mt-4 font-body text-[17px] font-medium leading-[1.75] text-charcoal">${escapeHtml(recipe.description)}</p>` : ''}
        ${renderMetadata(recipe)}
      </div>

      <div class="mx-auto max-w-[var(--max-width-narrow)] px-8 py-12 max-sm:px-4 md:max-w-[960px] md:grid md:grid-cols-[340px_1fr] md:items-start md:gap-12 print:block print:px-0 print:py-4 print:max-w-none">
        <div class="md:sticky md:top-24 print:static print:mb-6">${renderIngredients(recipe.ingredients)}</div>
        <div>${renderInstructions(recipe.steps)}</div>
      </div>

      <div class="mx-auto max-w-[var(--max-width-narrow)] space-y-12 px-8 pb-12 max-sm:px-4 md:max-w-[960px] print:space-y-4 print:px-0 print:pb-4 print:max-w-none">
        ${renderEquipment(recipe.equipment)}
        ${renderTips(recipe.tips, recipe.notes)}
      </div>
    </div>`
}
