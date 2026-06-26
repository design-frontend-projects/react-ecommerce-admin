import { createLazyFileRoute } from '@tanstack/react-router';
import { PipelineBoard } from '@/components/crm/PipelineBoard';

export const Route = createLazyFileRoute('/crm/pipeline')({
  component: PipelinePage,
});

function PipelinePage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Opportunity Pipeline</h1>
      <PipelineBoard />
    </div>
  );
}
