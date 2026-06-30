import { createFileRoute, Outlet } from '@tanstack/react-router';
import { withCRMAuth } from '@/components/crm/withCRMAuth';

export const Route = createFileRoute('/crm/_layout')({
  beforeLoad: async () => {
    // Basic route-level check logic could go here
    // We also use the withCRMAuth HOC for component-level protection
  },
  component: withCRMAuth(CRMLayout),
});

function CRMLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
