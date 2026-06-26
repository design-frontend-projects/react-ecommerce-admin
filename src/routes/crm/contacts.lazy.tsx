import { createLazyFileRoute } from '@tanstack/react-router';
import { CustomerList } from '@/components/crm/CustomerList';

export const Route = createLazyFileRoute('/crm/contacts')({
  component: ContactsPage,
});

function ContactsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">CRM Contacts</h1>
      <CustomerList />
    </div>
  );
}
