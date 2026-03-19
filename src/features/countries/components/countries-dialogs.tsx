import { useCountriesDialog } from './countries-provider'
import { CountriesActionDialog } from './countries-action-dialog'
import { CountriesDeleteDialog } from './countries-delete-dialog'

export function CountriesDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useCountriesDialog()

  return (
    <>
      <CountriesActionDialog
        key={`country-add-${open === 'add'}`}
        open={open === 'add'}
        onOpenChange={() => setOpen(null)}
      />

      {currentRow && (
        <>
          <CountriesActionDialog
            key={`country-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen(null)
              setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
          <CountriesDeleteDialog
            key={`country-delete-${currentRow.id}`}
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
