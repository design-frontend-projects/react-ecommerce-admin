import * as React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLookupsContext } from './provider'

export function LookupsPrimaryButtons() {
  const { selectedType, setIsCreateOpen } = useLookupsContext()

  return (
    <div className='flex items-center space-x-2'>
      <Button
        onClick={() => setIsCreateOpen(true)}
        disabled={!selectedType}
        className='space-x-1'
      >
        <span>Add Option</span> <Plus size={18} />
      </Button>
    </div>
  )
}
