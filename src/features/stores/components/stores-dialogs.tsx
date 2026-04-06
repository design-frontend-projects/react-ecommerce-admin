import { useStoresContext } from './stores-provider'
import { StoreActionDialog } from './store-action-dialog'
import { StoreDeleteDialog } from './store-delete-dialog'

export function StoresDialogs() {
  useStoresContext()

  return (
    <>
      <StoreActionDialog />
      <StoreDeleteDialog />
    </>
  )
}
