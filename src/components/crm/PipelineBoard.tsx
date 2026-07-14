import React, { useState } from 'react'
import { useCRMStore } from '@/store/crmStore'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STAGES = [
  'Lead',
  'Contacted',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
]

export function PipelineBoard() {
  const { opportunities, updateOpportunityStage } = useCRMStore()
  const [draggedId, setDraggedId] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    if (draggedId !== null) {
      updateOpportunityStage(draggedId, stage)
      setDraggedId(null)
    }
  }

  return (
    <div className='flex min-h-[600px] gap-4 overflow-x-auto p-4'>
      {STAGES.map((stage) => (
        <div
          key={stage}
          className='min-w-[300px] flex-1 rounded-lg bg-slate-100 p-4 dark:bg-slate-900'
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, stage)}
        >
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='text-lg font-semibold'>{stage}</h3>
            <Badge variant='secondary'>
              {opportunities.filter((o) => o.stage === stage).length}
            </Badge>
          </div>

          <div className='flex flex-col gap-3'>
            {opportunities
              .filter((opp) => opp.stage === stage)
              .map((opp) => (
                <Card
                  key={opp.opportunity_id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, opp.opportunity_id)}
                  className='cursor-move transition-colors hover:border-primary'
                >
                  <CardHeader className='p-4 pb-2'>
                    <CardTitle className='text-md'>
                      Opp #{opp.opportunity_id}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-4 pt-0'>
                    <p className='text-2xl font-bold'>
                      ${opp.value?.toLocaleString()}
                    </p>
                    <p className='mt-2 text-sm text-muted-foreground'>
                      Customer ID: {opp.customer_id}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
