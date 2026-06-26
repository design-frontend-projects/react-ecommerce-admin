import React, { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STAGES = ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export function PipelineBoard() {
  const { opportunities, updateOpportunityStage } = useCRMStore();
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedId !== null) {
      updateOpportunityStage(draggedId, stage);
      setDraggedId(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto p-4 min-h-[600px]">
      {STAGES.map(stage => (
        <div 
          key={stage}
          className="flex-1 min-w-[300px] bg-slate-100 dark:bg-slate-900 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, stage)}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">{stage}</h3>
            <Badge variant="secondary">
              {opportunities.filter(o => o.stage === stage).length}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-3">
            {opportunities
              .filter(opp => opp.stage === stage)
              .map(opp => (
                <Card 
                  key={opp.opportunity_id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, opp.opportunity_id)}
                  className="cursor-move hover:border-primary transition-colors"
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-md">Opp #{opp.opportunity_id}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">${opp.value?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Customer ID: {opp.customer_id}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
