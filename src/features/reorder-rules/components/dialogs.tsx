import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteRule } from '../hooks/use-reorder-rules'
import { useReorderRulesContext } from './provider'
import { RuleFormDialog } from './rule-form-dialog'

export function ReorderRulesDialogs() {
  const { open, setOpen, currentRow } = useReorderRulesContext()
  const deleteRule = useDeleteRule()

  return (
    <>
      <RuleFormDialog
        open={open === 'create'}
        onOpenChange={(value) => setOpen(value ? 'create' : null)}
        rule={null}
      />
      {currentRow ? (
        <>
          <RuleFormDialog
            open={open === 'edit'}
            onOpenChange={(value) => setOpen(value ? 'edit' : null)}
            rule={currentRow}
          />
          <AlertDialog
            open={open === 'delete'}
            onOpenChange={(value) => setOpen(value ? 'delete' : null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete reorder rule?</AlertDialogTitle>
                <AlertDialogDescription>
                  The rule for{' '}
                  {currentRow.product_variants?.sku ?? 'this variant'} at{' '}
                  {currentRow.stores?.name ?? 'this store'} will be permanently
                  deleted. Its open suggestions are removed with it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteRule.mutate(currentRow.id)
                    setOpen(null)
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </>
  )
}
