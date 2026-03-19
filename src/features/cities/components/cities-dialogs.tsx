import { useCitiesDialog } from './cities-provider'
import { CitiesActionDialog } from './cities-action-dialog'
import { CitiesDeleteDialog } from './cities-delete-dialog'

export function CitiesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useCitiesDialog()

  return (
    <>
      <CitiesActionDialog
        key={`city-add-${open === 'add'}`}
        open={open === 'add'}
        onOpenChange={() => setOpen(null)}
      />

      {currentRow && (
        <>
          <CitiesActionDialog
            key={`city-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen(null)
              setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
          <CitiesDeleteDialog
            key={`city-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen(null)
              setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
