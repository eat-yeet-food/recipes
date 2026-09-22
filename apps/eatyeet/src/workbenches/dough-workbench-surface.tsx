import { useEffect, type ComponentProps } from 'react'
import { DialogContent } from '@eat-yeet/l5-ui-primitives/primitives/dialog'

/** The calculator and its loading state share the same viewport sheet. */
export function DoughWorkbenchSurface(props: ComponentProps<typeof DialogContent>) {
  useEffect(() => {
    document.body.dataset.workbenchOpen = 'true'
    return () => { delete document.body.dataset.workbenchOpen }
  }, [])
  return <DialogContent {...props} variant="sheet" overlayClassName="z-[var(--z-workbench)]" className="top-0 right-0 bottom-0 left-auto z-[var(--z-workbench)] flex h-[100dvh] w-full !max-w-[600px] translate-x-0 translate-y-0 flex-col gap-0 overflow-x-hidden rounded-none border-0 bg-brand p-0 text-[var(--color-ink)] shadow-none ring-0 max-[640px]:!w-full max-[640px]:!max-w-none data-open:zoom-in-100 data-closed:zoom-out-100 data-open:slide-in-from-right data-closed:slide-out-to-right motion-reduce:transition-none" />
}
