import { useCategoriesContext } from './categories-provider'
import { CategoryActionDialog } from './category-action-dialog'
import { CategoryDeleteDialog } from './category-delete-dialog'

export function CategoriesDialogs() {
  const { open } = useCategoriesContext()

  return (
    <>
      <CategoryActionDialog />
      <CategoryDeleteDialog />
    </>
  )
}
