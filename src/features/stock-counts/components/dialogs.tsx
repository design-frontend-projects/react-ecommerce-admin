import { CountCreateDialog } from './create-dialog'
import { CountViewDialog } from './view-dialog'
import { useCountsContext } from './provider'

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
