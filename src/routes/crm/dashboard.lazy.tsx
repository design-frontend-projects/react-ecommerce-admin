import { createLazyFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/components/crm/Dashboard';

export const Route = createLazyFileRoute('/crm/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">CRM Dashboard</h1>
      <Dashboard />
    </div>
  );
}
