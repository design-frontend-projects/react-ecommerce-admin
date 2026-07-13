import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useReorderRulesContext } from './provider'

export function ReorderRulesPrimaryButtons() {
  const { setCurrentRow, setOpen } = useReorderRulesContext()
  return (
    <Can permission='inventory.manage'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        <Plus className='me-1 h-4 w-4' />
        New rule
      </Button>
    </Can>
  )
}
