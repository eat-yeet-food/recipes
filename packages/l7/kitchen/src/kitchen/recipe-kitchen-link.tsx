'use client'
import { Fragment, useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useAccount } from '@eat-yeet/l6-ui-shell/account/account'
import type { KitchenClient, KitchenFormulaSummary } from './kitchen-client'
import { kitchenPath } from './kitchen-plugin'

const textLink = 'font-action font-bold underline decoration-1 underline-offset-4 hover:decoration-2'

/**
 * The recipe page's only calculator entry point. Members see their own
 * versions after hydration; everyone else is invited to make one.
 */
export function RecipeKitchenLink({ recipeSlug, client }: { recipeSlug: string; client: KitchenClient }) {
  const { status } = useAccount()
  const [mine, setMine] = useState<KitchenFormulaSummary[]>([])
  useEffect(() => {
    if (status !== 'signed-in') { setMine([]); return }
    let active = true
    client.list().then(({ formulas }) => { if (active) setMine(formulas.filter((formula) => formula.recipeSlug === recipeSlug)) }, () => {})
    return () => { active = false }
  }, [status, client, recipeSlug])
  return <div data-recipe-kitchen="" className="mb-6 flex items-center gap-3.5 py-3 print:hidden">
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand"><FlaskConical className="size-5" /></span>
    <p className="min-w-0 text-[15px] leading-relaxed">
      {mine.length
        ? <>Your versions in Notebook: {mine.slice(0, 3).map((formula, index) => <Fragment key={formula.id}>
            {index > 0 && ', '}<a className={textLink} href={kitchenPath(recipeSlug, formula.id, true)}>{formula.name}</a>
          </Fragment>)}{mine.length > 3 && <>, <a className={textLink} href="/notebook">{mine.length - 3} more</a></>} · <a className={textLink} href={kitchenPath(recipeSlug)}>Start another</a></>
        : <>Change the batch, hydration or anything else: <a className={textLink} href={kitchenPath(recipeSlug)}>make this dough your own in your Notebook</a>.</>}
    </p>
  </div>
}
