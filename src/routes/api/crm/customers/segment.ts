import { createAPIFileRoute } from '@tanstack/react-start/api';
import prisma from '@/lib/prisma';

export const APIRoute = createAPIFileRoute('/api/crm/customers/segment')({
  POST: async ({ request }) => {
    try {
      const payload = await request.json();
      
      if (!payload.customerIds || !Array.isArray(payload.customerIds) || !payload.segment) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { customerIds, segment } = payload;

      const result = await prisma.customers.updateMany({
        where: {
          customer_id: {
            in: customerIds
          }
        },
        data: {
          crm_status: segment
        }
      });

      return new Response(JSON.stringify({ success: true, count: result.count }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Bulk Tagging Error:', error);
      return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
});
