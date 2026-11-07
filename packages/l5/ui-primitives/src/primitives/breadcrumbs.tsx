import { Fragment } from 'react'
import { cn } from '@eat-yeet/l0-foundation/utils'

export type Crumb = { label: string; href?: string }

/** The trail above a page title. The last crumb is the current page. */
export function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  return <nav aria-label="Breadcrumb" data-slot="breadcrumbs" className={cn('text-xs uppercase leading-[1.6] tracking-label text-ink print:hidden', className)}>
    <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1
        return <Fragment key={`${crumb.label}-${index}`}>
          {index > 0 && <li aria-hidden="true">&gt;</li>}
          <li>{crumb.href && !last ? <a href={crumb.href} className="underline-offset-4 hover:underline">{crumb.label}</a> : <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>}</li>
        </Fragment>
      })}
    </ol>
  </nav>
}
