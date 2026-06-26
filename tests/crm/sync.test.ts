import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncTransactionToCRM } from '@/services/crm/syncManager';

const mockPrisma = vi.hoisted(() => ({
  customers: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  pos_sales: {
    update: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

describe('CRM SyncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new customer profile if customer is not found', async () => {
    mockPrisma.customers.findFirst.mockResolvedValueOnce(null);
    mockPrisma.customers.create.mockResolvedValueOnce({
      customer_id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
    });

    const payload = {
      orderId: 101,
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
      },
      transactionAmount: 50.0,
    };

    const result = await syncTransactionToCRM(payload);

    expect(mockPrisma.customers.findFirst).toHaveBeenCalled();
    expect(mockPrisma.customers.create).toHaveBeenCalled();
    expect(result.customer_id).toBe(1);
    expect(mockPrisma.pos_sales.update).toHaveBeenCalledWith({
      where: { sale_id: 101 },
      data: { customer_id: 1 },
    });
  });

  it('should update existing customer profile if customer is found', async () => {
    mockPrisma.customers.findFirst.mockResolvedValueOnce({
      customer_id: 2,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
    });
    mockPrisma.customers.update.mockResolvedValueOnce({
      customer_id: 2,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '9876543210',
    });

    const payload = {
      orderId: 102,
      customer: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '9876543210',
      },
      transactionAmount: 120.0,
    };

    const result = await syncTransactionToCRM(payload);

    expect(mockPrisma.customers.findFirst).toHaveBeenCalled();
    expect(mockPrisma.customers.update).toHaveBeenCalled();
    expect(result.customer_id).toBe(2);
    expect(mockPrisma.pos_sales.update).toHaveBeenCalledWith({
      where: { sale_id: 102 },
      data: { customer_id: 2 },
    });
  });
});
