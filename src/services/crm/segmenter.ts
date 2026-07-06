import prisma from '@/lib/prisma';
import { subDays, subMonths } from 'date-fns';

export function determineSegment(customer: any, sales: any[]): string {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixMonthsAgo = subMonths(new Date(), 6);
  
  const segment = 'active'; // Default
  
  // If no activity in 6 months, inactive
  if (customer.last_active_at && new Date(customer.last_active_at) < sixMonthsAgo) {
    return 'inactive';
  }

  const recentSales = sales.filter(s => s.sale_date && new Date(s.sale_date) >= thirtyDaysAgo);
  
  if (recentSales.length > 0) {
    const totalSpend = recentSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    
    if (totalSpend > 500) {
      return 'VIP';
    } 
    
    if (recentSales.length >= 3) {
      return 'frequent';
    }
  }

  if (customer.created_at && new Date(customer.created_at) >= thirtyDaysAgo) {
    return 'new';
  }
  
  return segment;
}

export async function classifySegments() {
  const customers = await prisma.customers.findMany({
    include: {
      pos_sales: true
    }
  });

  const updates = customers.map((customer: any) => {
    const segment = determineSegment(customer, customer.pos_sales);
    return {
      customer_id: customer.customer_id,
      segment
    };
  });

  // Batch update
  const updatePromises = updates.map((u: any) => 
    prisma.customers.update({
      where: { customer_id: u.customer_id },
      data: { crm_status: u.segment }
    })
  );

  await Promise.all(updatePromises);
  
  return updates;
}
