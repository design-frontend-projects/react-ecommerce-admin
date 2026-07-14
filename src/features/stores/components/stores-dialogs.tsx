import { StoreActionDialog } from './store-action-dialog'
import { StoreDeleteDialog } from './store-delete-dialog'
import { useStoresContext } from './stores-provider'

export function StoresDialogs() {
  useStoresContext()

  return (
    <>
      <StoreActionDialog />
      <StoreDeleteDialog />
    </>
  )
}
