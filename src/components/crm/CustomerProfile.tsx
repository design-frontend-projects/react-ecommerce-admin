interface TimelineEvent {
  id: string
  type: 'order' | 'task' | 'note'
  date: string
  description: string
}

export function CustomerProfile({
  customerId: _customerId,
}: {
  customerId: number
}) {
  // In a real implementation, we would fetch the customer details and timeline by ID
  const customer = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
    phone: '123-456-7890',
    status: 'VIP',
  }

  const timeline: TimelineEvent[] = [
    {
      id: '1',
      type: 'order',
      date: '2026-06-25',
      description: 'Placed Order #1042 ($150)',
    },
    {
      id: '2',
      type: 'note',
      date: '2026-06-24',
      description: 'Customer called to ask about catering options',
    },
    {
      id: '3',
      type: 'task',
      date: '2026-06-26',
      description: 'Follow up on catering quote (Completed)',
    },
  ]

  return (
    <div className='flex flex-col gap-8 rounded bg-white p-6 shadow md:flex-row'>
      {/* Profile Sidebar */}
      <div className='w-full border-r pr-6 md:w-1/3'>
        <div className='mb-6 flex items-center gap-4'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white'>
            {customer.first_name[0]}
            {customer.last_name[0]}
          </div>
          <div>
            <h2 className='text-2xl font-bold'>
              {customer.first_name} {customer.last_name}
            </h2>
            <span className='rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800'>
              {customer.status}
            </span>
          </div>
        </div>

        <div className='space-y-4 text-sm'>
          <div>
            <span className='block text-gray-500'>Email</span>
            <span className='font-medium'>{customer.email}</span>
          </div>
          <div>
            <span className='block text-gray-500'>Phone</span>
            <span className='font-medium'>{customer.phone}</span>
          </div>
        </div>
      </div>

      {/* Unified Timeline View */}
      <div className='w-full md:w-2/3'>
        <h3 className='mb-6 text-xl font-bold'>Activity Timeline</h3>
        <div className='relative space-y-6 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent md:before:mx-auto md:before:translate-x-0'>
          {timeline.map((event) => (
            <div
              key={event.id}
              className='group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse'
            >
              <div className='z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-slate-300 text-slate-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2'>
                {/* Icon based on type */}
                {event.type === 'order' && <span>🛒</span>}
                {event.type === 'note' && <span>📝</span>}
                {event.type === 'task' && <span>✅</span>}
              </div>
              <div className='w-[calc(100%-4rem)] rounded border bg-white p-4 shadow md:w-[calc(50%-2.5rem)]'>
                <div className='mb-1 flex items-center justify-between'>
                  <span className='font-bold text-slate-700 capitalize'>
                    {event.type}
                  </span>
                  <span className='text-xs text-slate-500'>{event.date}</span>
                </div>
                <p className='text-sm text-slate-600'>{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
