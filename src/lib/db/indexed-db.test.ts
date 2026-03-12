import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './indexed-db';

describe('OfflineDatabase (Dexie)', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    // Ensure any open transactions are handled
    await db.close();
  });

  it('should be able to add and retrieve a product', async () => {
    const mockProduct = {
      id: 'prod_1',
      name: 'Test Product',
      slug: 'test-product',
      price: 15.00,
      track_inventory: true,
      stock_quantity: 10,
      category_id: 'cat_1',
      store_id: 'store_1',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.products.add(mockProduct);

    const products = await db.products.toArray();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Test Product');
    expect(products[0].store_id).toBe('store_1');
  });

  it('should be able to filter categories by store_id and is_active', async () => {
    await db.categories.bulkAdd([
      { id: 'cat_1', name: 'Drinks', slug: 'drinks', store_id: 'store_1', is_active: 1, created_at: '', updated_at: '' },
      { id: 'cat_2', name: 'Food', slug: 'food', store_id: 'store_1', is_active: 0, created_at: '', updated_at: '' },
      { id: 'cat_3', name: 'Merch', slug: 'merch', store_id: 'store_2', is_active: 1, created_at: '', updated_at: '' }
    ]);

    /*
    const activeStore1Categories = await db.categories
      .where('[store_id+is_active]')
      .equals(['store_1', true])
      .toArray();
    */

    const categoriesByStore = await db.categories
      .where('store_id').equals('store_1')
      .filter(c => c.is_active === 1)
      .toArray();

    expect(categoriesByStore).toHaveLength(1);
    expect(categoriesByStore[0].name).toBe('Drinks');
  });

  it('should auto-increment syncActions id', async () => {
    const id1 = await db.syncActions.add({
      type: 'CREATE',
      table: 'orders',
      entityId: 'ord_1',
      data: { total: 100 },
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    });

    const id2 = await db.syncActions.add({
      type: 'CREATE',
      table: 'orders',
      entityId: 'ord_2',
      data: { total: 200 },
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    });

    expect(id2).toBeGreaterThan(id1);
  });
});
