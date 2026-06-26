import React from 'react';

interface TimelineEvent {
  id: string;
  type: 'order' | 'task' | 'note';
  date: string;
  description: string;
}

export function CustomerProfile({ customerId }: { customerId: number }) {
  // In a real implementation, we would fetch the customer details and timeline by ID
  const customer = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
    phone: '123-456-7890',
    status: 'VIP',
  };

  const timeline: TimelineEvent[] = [
    { id: '1', type: 'order', date: '2026-06-25', description: 'Placed Order #1042 ($150)' },
    { id: '2', type: 'note', date: '2026-06-24', description: 'Customer called to ask about catering options' },
    { id: '3', type: 'task', date: '2026-06-26', description: 'Follow up on catering quote (Completed)' },
  ];

  return (
    <div className="p-6 bg-white rounded shadow flex flex-col md:flex-row gap-8">
      {/* Profile Sidebar */}
      <div className="w-full md:w-1/3 border-r pr-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {customer.first_name[0]}{customer.last_name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h2>
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-semibold">{customer.status}</span>
          </div>
        </div>
        
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-gray-500 block">Email</span>
            <span className="font-medium">{customer.email}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Phone</span>
            <span className="font-medium">{customer.phone}</span>
          </div>
        </div>
      </div>

      {/* Unified Timeline View */}
      <div className="w-full md:w-2/3">
        <h3 className="text-xl font-bold mb-6">Activity Timeline</h3>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {timeline.map((event) => (
            <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                {/* Icon based on type */}
                {event.type === 'order' && <span>🛒</span>}
                {event.type === 'note' && <span>📝</span>}
                {event.type === 'task' && <span>✅</span>}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border shadow">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700 capitalize">{event.type}</span>
                  <span className="text-xs text-slate-500">{event.date}</span>
                </div>
                <p className="text-slate-600 text-sm">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
