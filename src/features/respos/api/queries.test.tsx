import 'fake-indexeddb/auto'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMenuCategories, useMenuItemsWithDetails } from './queries'
import { db } from '@/lib/db/indexed-db'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
  },
}))

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
  },
})

describe('ResPOS Offline Queries', () => {
  beforeEach(async () => {
    await db.categories.clear()
    await db.products.clear()
    vi.clearAllMocks()
    
    // Default to online
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true
    })
  })

  it('should fetch from Supabase and cache to Dexie when online', async () => {
    const mockCategories = [{ id: '1', name: 'Drinks', sort_order: 1, is_active: true, created_at: '2023-01-01' }]
    
    // Mock Supabase
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCategories, error: null }),
    } as any))

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMenuCategories(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCategories)

    // Check if cached
    const cached = await db.categories.toArray()
    expect(cached.length).toBe(1)
    expect(cached[0].name).toBe('Drinks')
  })

  it('should fallback to Dexie when offline', async () => {
    // Seed Dexie with unique data
    await db.categories.add({
      id: 'offline_cat_1',
      name: 'Offline Pizza',
      slug: 'offline-pizza',
      is_active: 1,
      store_id: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: 1
    })

    // Set offline
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
      writable: true
    })

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMenuCategories(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })
    
    expect(result.current.data).toBeDefined()
    expect(result.current.data?.[0].name).toBe('Offline Pizza')
    
    // Supabase should not be called when offline
    expect(supabase.from).not.toHaveBeenCalledWith('res_menu_categories')
  })

  it('should fetch and cache menu items with details when online', async () => {
    const mockItems = [{ id: 'item1', name: 'Burger', base_price: 10, category_id: 'cat1', created_at: '', updated_at: '', is_available: true, is_active: true }]
    const mockVariants = [{ id: 'v1', item_id: 'item1', name: 'Cheese', price_adjustment: 2 }]
    const mockProperties = [{ id: 'p1', item_id: 'item1', name: 'Spicy', options: [] }]

    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'res_menu_items') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
        } as any
      }
      if (table === 'res_item_variants') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockVariants, error: null }),
        } as any
      }
      if (table === 'res_item_properties') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockProperties, error: null }),
        } as any
      }
      return {
        select: vi.fn().mockReturnThis(),
      } as any
    })

    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMenuItemsWithDetails(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data?.[0].variants).toEqual(mockVariants)
    expect(result.current.data?.[0].properties).toEqual(mockProperties)

    // Check if cached in Dexie (as products table)
    const cachedItems = await db.products.toArray()
    expect(cachedItems.length).toBe(1)
    expect(cachedItems[0].name).toBe('Burger')
    expect(cachedItems[0].is_active).toBe(1)
    expect(cachedItems[0].is_available).toBe(1)
    expect(cachedItems[0].variants).toEqual(mockVariants)
  })
})
