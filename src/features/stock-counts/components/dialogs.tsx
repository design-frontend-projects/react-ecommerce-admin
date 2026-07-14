import { CountCreateDialog } from './create-dialog'
import { useCountsContext } from './provider'
import { CountViewDialog } from './view-dialog'

export function CountsDialogs() {
  const { open, setOpen, currentRow } = useCountsContext()

  return (
    <>
      <CountCreateDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
      />
      {currentRow ? (
        <CountViewDialog
          count={currentRow}
          open={open === 'view'}
          onOpenChange={(value) => setOpen(value ? 'view' : null)}
        />
      ) : null}
    </>
  )
}
