import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';

export function CustomerList() {
  const { leads } = useCRMStore();
  const [filterSegment, setFilterSegment] = useState('all');
  
  // Note: We're using leads to proxy for customers in this basic store for now.
  // In a full implementation, customers and leads would be separated.
  const filteredCustomers = leads.filter(customer => {
    if (filterSegment === 'all') return true;
    return customer.status === filterSegment;
  });

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
        <select 
          value={filterSegment} 
          onChange={e => setFilterSegment(e.target.value)} 
          className="border rounded p-2 text-gray-700"
        >
          <option value="all">All Segments</option>
          <option value="VIP">VIP</option>
          <option value="frequent">Frequent</option>
          <option value="inactive">Inactive</option>
          <option value="new">New</option>
        </select>
      </div>
      
      <div className="grid gap-4">
        {filteredCustomers.length === 0 ? (
          <p className="text-gray-500">No customers found for this segment.</p>
        ) : (
          filteredCustomers.map(customer => (
            <div key={customer.lead_id} className="p-4 border rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center">
              <div>
                <p className="font-semibold text-lg">{customer.first_name} {customer.last_name}</p>
                {customer.company && <p className="text-sm text-gray-500">{customer.company}</p>}
              </div>
              <div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  customer.status === 'VIP' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {customer.status || 'Standard'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
