import { createLazyFileRoute } from '@tanstack/react-router'
import { CustomerList } from '@/components/crm/CustomerList'

export const Route = createLazyFileRoute('/crm/contacts')({
  component: ContactsPage,
})

function ContactsPage() {
  return (
    <div className='p-6'>
      <h1 className='mb-8 text-3xl font-bold'>CRM Contacts</h1>
      <CustomerList />
    </div>
  )
}
