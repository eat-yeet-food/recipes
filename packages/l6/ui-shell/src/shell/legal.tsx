import type { ReactNode } from 'react'

export type LegalSection = { heading: string; body: ReactNode }

/** Long-form policy page on the white reading surface with a dated heading. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return <article className="mx-auto w-full max-w-[var(--layout-recipe-copy)] px-4 py-12 text-ink">
    <h1 className="font-display text-[36px] font-extrabold leading-tight">{title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
    <div className="mt-6 text-base leading-relaxed">{intro}</div>
    {sections.map((section) => <section key={section.heading} className="mt-8">
      <h2 className="font-display text-2xl font-extrabold leading-tight">{section.heading}</h2>
      <div className="mt-3 grid gap-3 text-base leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1 [&_ul]:pl-6">{section.body}</div>
    </section>)}
  </article>
}
