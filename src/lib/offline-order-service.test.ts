import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { offlineOrderService } from './offline-order-service';
import { db } from './db/indexed-db';

// Mock IndexedDB
vi.mock('./db/indexed-db', () => ({
  db: {
    syncActions: {
      add: vi.fn(),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      and: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      get: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe('offlineOrderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save an offline order to syncActions', async () => {
    const orderData = {
      store_id: 'test-store',
      total_amount: 100,
      items: [{ id: '1', quantity: 1 }]
    };

    await offlineOrderService.saveOfflineOrder(orderData);

    expect(db.syncActions.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CREATE',
        table: 'orders',
        data: expect.objectContaining(orderData),
        status: 'pending'
      })
    );
  });

  it('should get pending orders', async () => {
    const mockOrders = [
      { id: 1, table: 'orders', status: 'pending' },
      { id: 2, table: 'orders', status: 'failed' }
    ];
    
    (db.syncActions.toArray as unknown as MockInstance).mockResolvedValue(mockOrders);

    const pending = await offlineOrderService.getPendingOrders();
    expect(pending).toEqual(mockOrders);
  });

  it('should mark an order as completed', async () => {
    await offlineOrderService.markAsCompleted(123);
    expect(db.syncActions.update).toHaveBeenCalledWith(123, {
      status: 'completed',
      error: undefined
    });
  });

  it('should mark an order as failed and increment retryCount', async () => {
    (db.syncActions.get as unknown as MockInstance).mockResolvedValue({ id: 123, retryCount: 1 });
    
    await offlineOrderService.markAsFailed(123, 'Network Error');
    
    expect(db.syncActions.update).toHaveBeenCalledWith(123, {
      status: 'failed',
      error: 'Network Error',
      retryCount: 2
    });
  });
});
