import { createLazyFileRoute } from '@tanstack/react-router'
import { PipelineBoard } from '@/components/crm/PipelineBoard'

export const Route = createLazyFileRoute('/crm/pipeline')({
  component: PipelinePage,
})

function PipelinePage() {
  return (
    <div className='p-6'>
      <h1 className='mb-8 text-3xl font-bold'>Opportunity Pipeline</h1>
      <PipelineBoard />
    </div>
  )
}
