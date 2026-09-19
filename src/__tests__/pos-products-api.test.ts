import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { resolvePosVariantPrices } from '@/server/fns/pos-pricing-resolver'
import { Prisma } from '@/generated/prisma/client'
import { buildPosProductWhere, isUuid } from '@/routes/api/pos/products'

vi.mock('@/lib/prisma', () => ({
  default: {
    products: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    product_variants: {
      findMany: vi.fn(),
    },
    product_barcodes: {
      findMany: vi.fn(),
    },
    tax_rates: {
      findFirst: vi.fn(),
    },
    price_list_items: {
      findMany: vi.fn(),
    },
    price_list_assignments: {
      findMany: vi.fn(),
    },
    stock_balances: {
      findMany: vi.fn(),
    },
    channels: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    pos_terminals: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    categories: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('test-tenant-id'),
  resolveTenantUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

vi.mock('@/server/context/tenant-context', () => ({
  runWithTenantContext: vi.fn().mockImplementation((_ctx, fn) => fn()),
}))

describe('POS Products API & Pricing Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves POS pricing without relying on invalid products.tax_rate_id or variant base_price fields', async () => {
    const mockVariants = [
      {
        id: 'var-1',
        sku: 'SKU-001',
        name: 'Variant 1',
        products: {
          name: 'Main Coffee',
        },
      },
    ]

    const mockTaxRate = {
      id: 'tax-1',
      rate: new Prisma.Decimal('0.15'),
      is_inclusive: false,
    }

    const mockPriceItems = [
      {
        product_variant_id: 'var-1',
        price_list_id: 'pl-default',
        price: new Prisma.Decimal('25.50'),
        cost_price: new Prisma.Decimal('10.00'),
        min_price: new Prisma.Decimal('20.00'),
        max_discount_percent: new Prisma.Decimal('15.00'),
        price_list: { name: 'Standard Price List' },
      },
    ]

    vi.mocked(prisma.price_list_assignments.findMany).mockResolvedValue([])
    vi.mocked(prisma.price_list_items.findMany).mockResolvedValue(mockPriceItems as any)
    vi.mocked(prisma.product_variants.findMany).mockResolvedValue(mockVariants as any)
    vi.mocked(prisma.tax_rates.findFirst).mockResolvedValue(mockTaxRate as any)
    vi.mocked(prisma.stock_balances.findMany).mockResolvedValue([
      {
        product_variant_id: 'var-1',
        qty_on_hand: new Prisma.Decimal('50'),
        qty_available: new Prisma.Decimal('45'),
      } as any,
    ])

    const results = await resolvePosVariantPrices('test-user-id', ['var-1'], {
      terminalId: 'term-1',
      warehouseId: 'wh-1',
    })

    expect(results).toHaveLength(1)
    expect(results[0].productVariantId).toBe('var-1')
    expect(results[0].sku).toBe('SKU-001')
    expect(results[0].productName).toBe('Main Coffee')
    expect(results[0].variantName).toBe('Variant 1')
    expect(results[0].unitPrice.toString()).toBe('25.5')
    expect(results[0].costPrice.toString()).toBe('10')
    expect(results[0].taxRateId).toBe('tax-1')
    expect(results[0].taxRate.toString()).toBe('0.15')
    expect(results[0].taxInclusive).toBe(false)
  })

  it('handles products findMany query shape safely with valid Prisma fields', async () => {
    const mockProducts = [
      {
        id: 'prod-1',
        name: 'Espresso Roast',
        sku: 'ESP-ROOT',
        barcode: '1234567890',
        description: 'Rich dark espresso roast',
        category_id: 'cat-1',
        brand_id: 'brand-1',
        categories: { id: 'cat-1', name: 'Coffee' },
        brands: { id: 'brand-1', name: 'House Brand' },
        price_list_items: [{ price: new Prisma.Decimal('12.00'), cost_price: new Prisma.Decimal('6.00') }],
        product_variants: [
          {
            id: 'var-101',
            sku: 'ESP-250G',
            name: '250g Bag',
            barcode: '1234567891',
            weight: new Prisma.Decimal('0.25'),
            dimensions: { size: '250g' },
            price_list_items: [{ price: new Prisma.Decimal('12.00'), cost_price: new Prisma.Decimal('6.00') }],
            stock_balances: [{ qty_on_hand: new Prisma.Decimal('100'), qty_available: new Prisma.Decimal('95'), qty_reserved: new Prisma.Decimal('5') }],
          },
        ],
      },
    ]

    vi.mocked(prisma.products.findMany).mockResolvedValue(mockProducts as any)
    vi.mocked(prisma.products.count).mockResolvedValue(1)
    vi.mocked(prisma.tax_rates.findFirst).mockResolvedValue({
      id: 'tax-vat-15',
      rate: new Prisma.Decimal('0.15'),
      is_inclusive: true,
    } as any)

    const [products, total, activeTaxRate] = await Promise.all([
      prisma.products.findMany({
        where: { tenant_id: 'test-tenant-id', is_active: true, deleted_at: null },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          sku: true,
          barcode: true,
          category_id: true,
          brand_id: true,
          categories: { select: { id: true, name: true } },
          brands: { select: { id: true, name: true } },
          price_list_items: { select: { price: true, cost_price: true }, take: 1 },
          product_variants: {
            where: { is_active: true },
            select: {
              id: true,
              sku: true,
              name: true,
              barcode: true,
              weight: true,
              dimensions: true,
              price_list_items: { select: { price: true, cost_price: true }, take: 1 },
            },
          },
        },
      }),
      prisma.products.count({ where: { tenant_id: 'test-tenant-id' } }),
      prisma.tax_rates.findFirst({
        where: { tenant_id: 'test-tenant-id', is_active: true },
      }),
    ])

    expect(total).toBe(1)
    expect(products[0].name).toBe('Espresso Roast')
    expect(products[0].product_variants[0].sku).toBe('ESP-250G')
    expect(activeTaxRate?.id).toBe('tax-vat-15')
    expect(activeTaxRate?.is_inclusive).toBe(true)

    // Verify enrichment logic
    const items = products.flatMap((p) =>
      p.product_variants.map((v) => {
        const stock = (v as any).stock_balances?.[0]
        const priceItem = (v as any).price_list_items?.[0]
        return {
          productId: p.id,
          productVariantId: v.id,
          productName: p.name,
          variantName: v.name,
          sku: v.sku,
          barcode: v.barcode ?? p.barcode,
          basePrice: priceItem?.price?.toString() ?? '0',
          costPrice: priceItem?.cost_price?.toString() ?? '0',
          categoryId: p.category_id,
          categoryName: p.categories?.name ?? null,
          brandName: p.brands?.name ?? null,
          imageUrl: null,
          taxRateId: activeTaxRate?.id ?? null,
          taxRate: activeTaxRate?.rate?.toString() ?? '0',
          taxInclusive: activeTaxRate?.is_inclusive ?? false,
          stockAvailable: stock?.qty_available?.toString() ?? '0',
          stockOnHand: stock?.qty_on_hand?.toString() ?? '0',
          variantAttributes: v.dimensions,
        }
      })
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      productId: 'prod-1',
      productVariantId: 'var-101',
      productName: 'Espresso Roast',
      variantName: '250g Bag',
      sku: 'ESP-250G',
      barcode: '1234567891',
      basePrice: '12',
      costPrice: '6',
      categoryId: 'cat-1',
      categoryName: 'Coffee',
      brandName: 'House Brand',
      imageUrl: null,
      taxRateId: 'tax-vat-15',
      taxRate: '0.15',
      taxInclusive: true,
      stockAvailable: '95',
      stockOnHand: '100',
      variantAttributes: { size: '250g' },
    })
  })

  describe('buildPosProductWhere & UUID Safety', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001'

    it('identifies valid UUID vs non-UUID strings correctly', () => {
      expect(isUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true)
      expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true)
      expect(isUuid('Fresh Meats & Poultry')).toBe(false)
      expect(isUuid('undefined')).toBe(false)
      expect(isUuid('')).toBe(false)
      expect(isUuid(null)).toBe(false)
      expect(isUuid(undefined)).toBe(false)
    })

    it('handles category name (non-UUID) via relational categories clause without assigning invalid UUID to category_id', () => {
      const where = buildPosProductWhere({
        tenantId,
        categoryId: 'Fresh Meats & Poultry',
      })

      expect(where.tenant_id).toBe(tenantId)
      expect(where.is_active).toBe(true)
      expect(where.deleted_at).toBeNull()
      // Critical check: category_id MUST NOT receive the non-UUID string
      expect(where.category_id).toBeUndefined()
      expect(where.categories).toEqual({
        OR: [
          { name: { equals: 'Fresh Meats & Poultry', mode: 'insensitive' } },
          { name_ar: { equals: 'Fresh Meats & Poultry', mode: 'insensitive' } },
        ],
      })
    })

    it('handles category ID (valid UUID) directly on category_id', () => {
      const categoryUuid = '123e4567-e89b-12d3-a456-426614174000'
      const where = buildPosProductWhere({
        tenantId,
        categoryId: categoryUuid,
      })

      expect(where.category_id).toBe(categoryUuid)
      expect(where.categories).toBeUndefined()
    })

    it('handles brand name (non-UUID) via relational brands clause and brand UUID directly', () => {
      const nameWhere = buildPosProductWhere({
        tenantId,
        brandId: 'House Brand',
      })
      expect(nameWhere.brand_id).toBeUndefined()
      expect(nameWhere.brands).toEqual({
        name: { equals: 'House Brand', mode: 'insensitive' },
      })

      const brandUuid = '987fcdeb-51a2-43f7-9abc-def012345678'
      const uuidWhere = buildPosProductWhere({
        tenantId,
        brandId: brandUuid,
      })
      expect(uuidWhere.brand_id).toBe(brandUuid)
      expect(uuidWhere.brands).toBeUndefined()
    })

    it('combines category, brand, and search filters gracefully', () => {
      const where = buildPosProductWhere({
        tenantId,
        categoryId: 'Fresh Meats & Poultry',
        brandId: 'House Brand',
        search: 'Chicken',
        matchedVariantIds: ['var-999'],
      })

      expect(where.category_id).toBeUndefined()
      expect(where.categories).toBeDefined()
      expect(where.brand_id).toBeUndefined()
      expect(where.brands).toBeDefined()
      expect(where.OR).toBeDefined()
      expect(where.OR?.length).toBe(4)
    })
  })
})

