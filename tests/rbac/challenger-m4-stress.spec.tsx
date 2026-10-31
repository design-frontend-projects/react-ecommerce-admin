import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  stripSensitiveCostFields,
  hasCostViewPermission,
  stripSensitiveCostColumns,
  SENSITIVE_COST_KEYS,
} from '@/server/utils/cost-sanitizer'
import { parseCsvRecords, executeProductImport } from '@/server/fns/product-import'
import { assertProductMutationPermissions } from '@/server/fns/products'
import { Can } from '@/components/rbac/Can'
import { PermissionGate, ScreenGate } from '@/components/rbac/permission-gate'
import { RequireScreen } from '@/components/rbac/require-screen'
import { PermissionRegistry } from '@/lib/rbac/registry'
import type { AuthorizedContext } from '@/server/utils/with-server-fn-auth'


// Mocks for useUser, useAuth, usePermissions, and Prisma
const mockUseUser = vi.fn()
const mockUseAuth = vi.fn()
const mockUsePermissions = vi.fn()
const mockUseLocation = vi.fn()
const mockUseNavigate = vi.fn()

vi.mock('@/lib/prisma', () => {
  const mockCategories = [{ id: 'cat-11111111-1111-1111-1111-111111111111' }]
  const mockSuppliers = [{ id: 'sup-11111111-1111-1111-1111-111111111111' }]
  const mockWarehouses = [{ id: 'wh-11111111-1111-1111-1111-111111111111' }]
  const mockBrands = [{ id: 'br-11111111-1111-1111-1111-111111111111' }]
  const mockUoms = [{ id: 'uom-11111111-1111-1111-1111-111111111111' }]

  return {
    default: {
      categories: { findMany: vi.fn().mockResolvedValue(mockCategories) },
      suppliers: { findMany: vi.fn().mockResolvedValue(mockSuppliers) },
      warehouses: { findMany: vi.fn().mockResolvedValue(mockWarehouses) },
      brands: { findMany: vi.fn().mockResolvedValue(mockBrands) },
      uoms: { findMany: vi.fn().mockResolvedValue(mockUoms) },
      products: { findMany: vi.fn().mockResolvedValue([{ sku: 'EXISTING-DB-SKU', barcode: 'EXISTING-DB-BARCODE' }]) },
      product_variants: { findMany: vi.fn().mockResolvedValue([]) },
      product_barcodes: { findMany: vi.fn().mockResolvedValue([]) },
      price_list: { findFirst: vi.fn().mockResolvedValue({ id: 'pl-default' }) },
      $transaction: vi.fn().mockImplementation((fn: any) => fn({
        products: { create: vi.fn().mockResolvedValue({ id: 'p-new-1' }) },
        product_variants: { create: vi.fn().mockResolvedValue({ id: 'pv-new-1' }) },
        product_barcodes: { create: vi.fn().mockResolvedValue({}) },
        product_suppliers: { create: vi.fn().mockResolvedValue({}) },
        price_list_items: { create: vi.fn().mockResolvedValue({}) },
        inventory_items: { create: vi.fn().mockResolvedValue({}) },
      })),
    },
  }
})

vi.mock('@/hooks/use-auth', () => ({
  useUser: () => mockUseUser(),
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => mockUsePermissions(),
}))

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockUseLocation(),
  useNavigate: () => mockUseNavigate(),
  useRouter: () => ({ history: { back: vi.fn() } }),
}))


describe('teamwork_challenger_m4_1: Adversarial Stress Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLocation.mockReturnValue({ pathname: '/products' })
    mockUseNavigate.mockReturnValue(vi.fn().mockResolvedValue(undefined))
  })

  // =========================================================================
  // 1. SENSITIVE FIELD STRIPPING PIPELINE ADVERSARIAL CHALLENGES
  // =========================================================================
  describe('Dimension 1: Sensitive Cost Stripping Pipeline', () => {
    it('exhaustively strips all sensitive metric keys and naming casing variants without products.view_cost', () => {
      const hostilePayload = {
        id: 'prod-999',
        name: 'Sensitive Item',
        sku: 'SENS-01',
        selling_price: 100,
        price: 99.99,
        // snake_case
        cost_price: 45.5,
        unit_cost: 40.0,
        purchase_price: 38.0,
        markup_percent: 25.0,
        margin: 54.5,
        margins: 54.5,
        margin_percent: 54.5,
        profit: 54.5,
        gross_profit: 54.5,
        net_profit: 40.0,
        avg_cost: 42.0,
        total_value: 4200.0,
        valuation: 4200.0,
        standard_unit_cost: 40.0,
        avco_unit_cost: 41.0,
        fifo_unit_cost: 40.5,
        // camelCase
        costPrice: 45.5,
        unitCost: 40.0,
        purchasePrice: 38.0,
        markupPercent: 25.0,
        marginPercent: 54.5,
        grossProfit: 54.5,
        netProfit: 40.0,
        avgCost: 42.0,
        totalValue: 4200.0,
        standardUnitCost: 40.0,
        // UPPERCASE & Delimited variations
        COST_PRICE: 45.5,
        UNIT_COST: 40.0,
        'cost-price': 45.5,
        'cost price': 45.5,
        'purchase-price': 38.0,
        'margin-percent': 54.5,
        'gross-profit': 54.5,
        'net-profit': 40.0,
      }

      const stripped = stripSensitiveCostFields(hostilePayload, false)

      // Public fields must be preserved
      expect(stripped.id).toBe('prod-999')
      expect(stripped.name).toBe('Sensitive Item')
      expect(stripped.sku).toBe('SENS-01')
      expect(stripped.selling_price).toBe(100)
      expect(stripped.price).toBe(99.99)

      // Every sensitive key MUST be completely stripped
      for (const key of Object.keys(hostilePayload)) {
        if (['id', 'name', 'sku', 'selling_price', 'price'].includes(key)) continue
        expect(stripped).not.toHaveProperty(key)
      }
    })

    it('recursively scrubs deep 4-level nested arrays, variants, price-lists, and supplier links', () => {
      const deeplyNested = {
        id: 'prod-001',
        name: 'Widget',
        cost_price: 10,
        variants: [
          {
            id: 'var-1',
            costPrice: 12,
            sellingPrice: 25,
            price_list_items: [
              {
                id: 'pli-1',
                price: 25,
                cost_price: 12,
                margin: 52,
                markup: 108.3,
                discounts: [{ id: 'd-1', max_discount: 5, est_unit_cost: 12 }],
              },
            ],
            supplier_links: [
              { id: 'sl-1', unit_cost: 11.5, purchase_price: 11.5, supplier_name: 'Alpha' },
            ],
          },
        ],
      }

      const clean = stripSensitiveCostFields(deeplyNested, false)

      expect(clean.cost_price).toBeUndefined()
      expect(clean.variants[0].costPrice).toBeUndefined()
      expect(clean.variants[0].sellingPrice).toBe(25)
      expect(clean.variants[0].price_list_items[0].cost_price).toBeUndefined()
      expect(clean.variants[0].price_list_items[0].margin).toBeUndefined()
      expect(clean.variants[0].price_list_items[0].markup).toBeUndefined()
      expect(clean.variants[0].price_list_items[0].price).toBe(25)
      expect(clean.variants[0].price_list_items[0].discounts[0].est_unit_cost).toBeUndefined()
      expect(clean.variants[0].price_list_items[0].discounts[0].max_discount).toBe(5)
      expect(clean.variants[0].supplier_links[0].unit_cost).toBeUndefined()
      expect(clean.variants[0].supplier_links[0].purchase_price).toBeUndefined()
      expect(clean.variants[0].supplier_links[0].supplier_name).toBe('Alpha')
    })

    it('safely handles null, undefined, primitive, Date, and regex values without corruption', () => {
      const now = new Date()
      const pattern = /^[a-z]+$/i

      expect(stripSensitiveCostFields(null, false)).toBeNull()
      expect(stripSensitiveCostFields(undefined, false)).toBeUndefined()
      expect(stripSensitiveCostFields(12345, false)).toBe(12345)
      expect(stripSensitiveCostFields('hello world', false)).toBe('hello world')
      expect(stripSensitiveCostFields(true, false)).toBe(true)

      const objWithDate = {
        created_at: now,
        pattern,
        cost_price: 50,
      }
      const sanitized = stripSensitiveCostFields(objWithDate, false)
      expect(sanitized.created_at).toBe(now)
      expect(sanitized.pattern).toBe(pattern)
      expect(sanitized.cost_price).toBeUndefined()
    })

    it('preserves all cost and profit metrics when caller holds products.view_cost or wildcard', () => {
      const payload = { cost_price: 45.5, unit_cost: 40.0, margin: 54.5, profit: 54.5 }

      const preservedDirect = stripSensitiveCostFields(payload, true)
      expect(preservedDirect.cost_price).toBe(45.5)
      expect(preservedDirect.unit_cost).toBe(40.0)
      expect(preservedDirect.margin).toBe(54.5)
      expect(preservedDirect.profit).toBe(54.5)

      expect(hasCostViewPermission(['products.view_cost'])).toBe(true)
      expect(hasCostViewPermission(['*'])).toBe(true)
      expect(hasCostViewPermission(['products.view_cost', 'products.view'])).toBe(true)
    })

    it('enforces isolation: products.manage or general.products.manage DO NOT imply products.view_cost', () => {
      // Security rule: sensitive financial cost view must not be leaked through general management
      expect(hasCostViewPermission(['products.manage'])).toBe(false)
      expect(hasCostViewPermission(['general.products.manage'])).toBe(false)
      expect(hasCostViewPermission(['products.view'])).toBe(false)
      expect(hasCostViewPermission(['products.create'])).toBe(false)
      expect(hasCostViewPermission(['products.update'])).toBe(false)
      expect(hasCostViewPermission(['products.manage_prices'])).toBe(false)
      expect(hasCostViewPermission([])).toBe(false)
    })

    it('strips cost columns in tabular/export data via stripSensitiveCostColumns', () => {
      const rows = [
        { sku: 'A1', name: 'Alpha', selling_price: 20, cost_price: 10, margin: 50 },
        { sku: 'B2', name: 'Beta', selling_price: 30, cost_price: 15, margin: 50 },
      ]

      const scrubbed = stripSensitiveCostColumns(rows, false)
      expect(scrubbed).toHaveLength(2)
      expect(scrubbed[0].sku).toBe('A1')
      expect(scrubbed[0].selling_price).toBe(20)
      expect(scrubbed[0].cost_price).toBeUndefined()
      expect(scrubbed[0].margin).toBeUndefined()
      expect(scrubbed[1].cost_price).toBeUndefined()

      const unscrubbed = stripSensitiveCostColumns(rows, true)
      expect(unscrubbed[0].cost_price).toBe(10)
      expect(unscrubbed[0].margin).toBe(50)
    })
  })

  // =========================================================================
  // 2. CSV PRODUCT IMPORT PARSING, VALIDATION & ATOMIC ROLLBACK
  // =========================================================================
  describe('Dimension 2: CSV Product Import Pipeline', () => {
    it('correctly parses complex RFC-4180 CSV records with quotes, commas, BOM, and CRLF', () => {
      const csv =
        '\uFEFF"name","sku","selling_price","description"\r\n' +
        '"Espresso ""Special"" Blend","COFFEE-001",4.99,"Rich, dark roast with notes of cocoa"\r\n' +
        '"Latte 12oz, Vanilla","LATTE-VAN-12",5.50,"Made with organic milk"\n'

      const parsed = parseCsvRecords(csv)

      expect(parsed.headers).toEqual(['name', 'sku', 'selling_price', 'description'])
      expect(parsed.rows).toHaveLength(2)

      expect(parsed.rows[0].data.name).toBe('Espresso "Special" Blend')
      expect(parsed.rows[0].data.sku).toBe('COFFEE-001')
      expect(parsed.rows[0].data.selling_price).toBe('4.99')
      expect(parsed.rows[0].data.description).toBe('Rich, dark roast with notes of cocoa')

      expect(parsed.rows[1].data.name).toBe('Latte 12oz, Vanilla')
      expect(parsed.rows[1].data.sku).toBe('LATTE-VAN-12')
      expect(parsed.rows[1].data.selling_price).toBe('5.50')
      expect(parsed.rows[1].data.description).toBe('Made with organic milk')
    })

    it('rejects empty or whitespace-only CSV input with row 1 error', async () => {
      const ctx = {
        tenantId: 'tenant-123',
        user: { userId: 'u1', permissionNames: ['products.import'] },
        tenantUserId: 'tu-1',
      } as unknown as AuthorizedContext

      const result = await executeProductImport({ csvContent: '   \n\r\n  ' }, ctx)
      expect(result.success).toBe(false)
      expect(result.importedCount).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].row).toBe(1)
      expect(result.errors[0].field).toBe('csvContent')
    })

    it('detects duplicate SKUs and duplicate barcodes within the CSV file and rejects atomically', async () => {
      const csv =
        'name,sku,barcode,selling_price\n' +
        'Product One,SKU-DUP-1,111222333,10.00\n' +
        'Product Two,SKU-UNIQUE,444555666,20.00\n' +
        'Product Three,SKU-DUP-1,777888999,30.00\n' + // Duplicate SKU with row 2
        'Product Four,SKU-DIFF,111222333,40.00\n' // Duplicate Barcode with row 2

      const ctx = {
        tenantId: 'tenant-123',
        user: { userId: 'u1', permissionNames: ['products.import'] },
        tenantUserId: 'tu-1',
      } as unknown as AuthorizedContext

      const result = await executeProductImport({ csvContent: csv }, ctx)
      expect(result.success).toBe(false)
      expect(result.importedCount).toBe(0)

      const skuDupError = result.errors.find((e) => e.field === 'sku' && e.row === 4)
      expect(skuDupError).toBeDefined()
      expect(skuDupError?.error).toContain("Duplicate SKU 'SKU-DUP-1'")

      const barcodeDupError = result.errors.find((e) => e.field === 'barcode' && e.row === 5)
      expect(barcodeDupError).toBeDefined()
      expect(barcodeDupError?.error).toContain("Duplicate barcode '111222333'")
    })

    it('validates invalid UUID foreign keys and negative prices with structured errors', async () => {
      const csv =
        'name,sku,selling_price,cost_price,category_id,supplier_id\n' +
        'Valid Name,SKU-INV-FK,-5.00,-10.00,not-a-valid-uuid,invalid-supplier-uuid\n'

      const ctx = {
        tenantId: 'tenant-123',
        user: { userId: 'u1', permissionNames: ['products.import'] },
        tenantUserId: 'tu-1',
      } as unknown as AuthorizedContext

      const result = await executeProductImport({ csvContent: csv }, ctx)
      expect(result.success).toBe(false)
      expect(result.importedCount).toBe(0)

      expect(result.errors.some((e) => e.field === 'selling_price')).toBe(true)
      expect(result.errors.some((e) => e.field === 'cost_price')).toBe(true)
      expect(result.errors.some((e) => e.field === 'category_id')).toBe(true)
      expect(result.errors.some((e) => e.field === 'supplier_id')).toBe(true)
    })
    it('detects duplicate SKU against tenant database and rejects', async () => {
      const csv =
        'name,sku,selling_price\n' +
        'Product Against DB,EXISTING-DB-SKU,10.00\n'

      const ctx = {
        tenantId: 'tenant-123',
        user: { userId: 'u1', permissionNames: ['products.import'] },
        tenantUserId: 'tu-1',
      } as unknown as AuthorizedContext

      const result = await executeProductImport({ csvContent: csv }, ctx)
      expect(result.success).toBe(false)
      expect(result.importedCount).toBe(0)
      expect(result.errors.some((e) => e.field === 'sku' && e.error.includes('already exists in your organization'))).toBe(true)
    })
  })

  // =========================================================================
  // 3. CLIENT HOOKS & DECLARATIVE GATING COMPONENTS (<Can>, <PermissionGate>, <ScreenGate>)
  // =========================================================================
  describe('Dimension 3: Client Hooks & Declarative UI Gates', () => {
    it('<Can> renders fallback when user is unauthenticated or not loaded', () => {
      // 1. Not loaded
      mockUseUser.mockReturnValue({ isLoaded: false, user: null })
      mockUsePermissions.mockReturnValue({
        isLoading: true,
        data: undefined,
        roles: [],
        permissions: [],
        isSuperAdmin: false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
      })

      const { rerender } = render(
        <Can permission="products.create" fallback={<span data-testid="fallback">Denied</span>}>
          <button data-testid="btn">Create Product</button>
        </Can>
      )

      expect(screen.queryByTestId('btn')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback')).toBeInTheDocument()

      // 2. User not signed in
      mockUseUser.mockReturnValue({ isLoaded: true, user: null })
      rerender(
        <Can permission="products.create" fallback={<span data-testid="fallback">Denied</span>}>
          <button data-testid="btn">Create Product</button>
        </Can>
      )

      expect(screen.queryByTestId('btn')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback')).toBeInTheDocument()
    })

    it('<Can> handles negation (not=true) correctly for unauthenticated and authenticated users', () => {
      // Unauthenticated user with not=true should see children
      mockUseUser.mockReturnValue({ isLoaded: true, user: null })
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        data: undefined,
        roles: [],
        permissions: [],
        isSuperAdmin: false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
      })

      const { rerender } = render(
        <Can role="admin" not fallback={<span data-testid="fallback">Admin Only</span>}>
          <span data-testid="guest-view">Guest Banner</span>
        </Can>
      )

      expect(screen.getByTestId('guest-view')).toBeInTheDocument()

      // Authenticated admin with not=true should see fallback
      mockUseUser.mockReturnValue({ isLoaded: true, user: { id: 'u1' } })
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        data: { roles: ['admin'] },
        roles: ['admin'],
        permissions: ['*'],
        isSuperAdmin: false,
        hasAnyPermission: () => true,
        hasAllPermissions: () => true,
      })

      rerender(
        <Can role="admin" not fallback={<span data-testid="fallback">Admin Only</span>}>
          <span data-testid="guest-view">Guest Banner</span>
        </Can>
      )

      expect(screen.queryByTestId('guest-view')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback')).toBeInTheDocument()
    })

    it('<Can> supports any vs all multi-permission logic and role-based checks', () => {
      mockUseUser.mockReturnValue({ isLoaded: true, user: { id: 'u1' } })

      // User has perm1 but NOT perm2
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        data: { permissions: ['products.view'] },
        roles: ['staff'],
        permissions: ['products.view'],
        isSuperAdmin: false,
        hasAnyPermission: (perms: string[]) => perms.includes('products.view'),
        hasAllPermissions: (perms: string[]) =>
          perms.every((p) => p === 'products.view'),
      })

      // any=['products.view', 'products.delete'] -> ALLOWED
      const { rerender } = render(
        <Can any={['products.view', 'products.delete']} fallback={<span>Denied</span>}>
          <div data-testid="any-content">Allowed by Any</div>
        </Can>
      )
      expect(screen.getByTestId('any-content')).toBeInTheDocument()

      // all=['products.view', 'products.delete'] -> DENIED
      rerender(
        <Can all={['products.view', 'products.delete']} fallback={<span data-testid="all-denied">Denied</span>}>
          <div data-testid="all-content">Allowed by All</div>
        </Can>
      )
      expect(screen.queryByTestId('all-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('all-denied')).toBeInTheDocument()
    })

    it('<PermissionGate> displays loadingFallback while auth or permissions are pending', () => {
      mockUseUser.mockReturnValue({ isLoaded: true, user: { id: 'u1' } })
      mockUsePermissions.mockReturnValue({
        isLoading: true,
        data: undefined,
        roles: [],
        permissions: [],
        isSuperAdmin: false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
      })

      render(
        <PermissionGate
          permission="products.view"
          loadingFallback={<span data-testid="loading-spinner">Loading...</span>}
          fallback={<span data-testid="unauth">Unauthorized</span>}
        >
          <span data-testid="secure-content">Secure</span>
        </PermissionGate>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.queryByTestId('secure-content')).not.toBeInTheDocument()
      expect(screen.queryByTestId('unauth')).not.toBeInTheDocument()
    })

    it('<ScreenGate> renders screen content when authenticated and allowed', () => {
      mockUseUser.mockReturnValue({ isLoaded: true, user: { id: 'u1' } })
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        data: { screens: { '/products': true } },
        canAccessScreen: (path: string) => path === '/products',
      })

      render(
        <ScreenGate screen="/products" fallback={<span data-testid="screen-denied">No Access</span>}>
          <div data-testid="screen-content">Product Screen</div>
        </ScreenGate>
      )
      expect(screen.getByTestId('screen-content')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // 4. ROUTE BLOCKING & DIRECT URL NAVIGATION GUARDS (<RequireScreen>)
  // =========================================================================
  describe('Dimension 4: Direct Route Access & Screen Guards', () => {
    it('<RequireScreen> blocks unauthorized direct route navigation with ForbiddenError (fail-closed)', () => {
      mockUseLocation.mockReturnValue({ pathname: '/access-control/users' })
      mockUseUser.mockReturnValue({ isLoaded: true, user: { id: 'u1' } })
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        data: { screens: { '/access-control/users': false } },
        canAccessScreen: (path: string) => path === '/dashboard',
      })

      render(
        <RequireScreen screen="/access-control/users">
          <div data-testid="secret-screen">User Management Secrets</div>
        </RequireScreen>
      )

      expect(screen.queryByTestId('secret-screen')).not.toBeInTheDocument()
      // ForbiddenError renders an access denied or 403 banner
      const matches = screen.getAllByText(/403|Forbidden|Access Denied/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('<RequireScreen> permits whitelisted system routes without specific screen permissions', () => {
      mockUseLocation.mockReturnValue({ pathname: '/profile' })
      mockUseUser.mockReturnValue({ isLoaded: true, user: { id: 'u1' } })
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        data: { screens: {} },
        canAccessScreen: () => false, // Denies everything by default
      })

      render(
        <RequireScreen screen="/profile">
          <div data-testid="profile-screen">My Profile</div>
        </RequireScreen>
      )

      expect(screen.getByTestId('profile-screen')).toBeInTheDocument()
    })

    it('<RequireScreen> triggers redirect when redirectTo prop is supplied on unauthorized access', () => {
      const navigateMock = vi.fn().mockResolvedValue(undefined)
      mockUseNavigate.mockReturnValue(navigateMock)

      mockUseLocation.mockReturnValue({ pathname: '/purchasing' })
      mockUseUser.mockReturnValue({ isLoaded: true, user: { id: 'u1' } })
      mockUsePermissions.mockReturnValue({
        isLoading: false,
        data: { screens: {} },
        canAccessScreen: () => false,
      })

      render(
        <RequireScreen screen="/purchasing" redirectTo="/403">
          <div>Purchasing Module</div>
        </RequireScreen>
      )

      expect(navigateMock).toHaveBeenCalledWith({ to: '/403' })
    })

    it('<RequireScreen> shows loader and never flashes protected child content during initialization', () => {
      mockUseLocation.mockReturnValue({ pathname: '/inventory' })
      mockUseUser.mockReturnValue({ isLoaded: false, user: null })
      mockUsePermissions.mockReturnValue({
        isLoading: true,
        data: undefined,
        canAccessScreen: () => false,
      })

      render(
        <RequireScreen screen="/inventory">
          <div data-testid="flash-content">Super Secret Inventory Data</div>
        </RequireScreen>
      )

      expect(screen.queryByTestId('flash-content')).not.toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).not.toBeNull()
    })
  })

  // =========================================================================
  // 5. CENTRALIZED PERMISSION REGISTRY ADVERSARIAL STRESS
  // =========================================================================
  describe('Dimension 5: Centralized Permission Registry Access Computation', () => {
    it('PermissionRegistry computes screen access and default DENY for uncataloged routes', () => {
      const registry = PermissionRegistry.getInstance()

      // Test computeUserAccess with standard staff permissions
      const staffAccess = registry.computeUserAccess(['products.view', 'general.products.view'], false)
      expect(staffAccess.screens['/products']).toBe(true)
      expect(staffAccess.screens['/users']).toBe(false)
      // Uncataloged route is omitted from registry screen mapping (default DENY evaluated by hook)
      expect(staffAccess.screens['/non-existent-screen']).toBeUndefined()

      // Test computeUserAccess for super admin with wildcard
      const adminAccess = registry.computeUserAccess(['*'], true)
      expect(adminAccess.screens['/products']).toBe(true)
      expect(adminAccess.screens['/users']).toBe(true)
      expect(adminAccess.modules).toContain('products')
    })
  })

  // =========================================================================
  // 6. FINE-GRAINED PRODUCT MUTATION GUARDRAILS
  // =========================================================================
  describe('Dimension 6: Fine-grained Product Mutation Guardrails', () => {
    it('allows general managers and superadmins to perform any mutation', () => {
      expect(() =>
        assertProductMutationPermissions(['products.manage'], {
          isCreate: true,
          hasPriceChanges: true,
          hasVariantChanges: true,
          hasBarcodeChanges: true,
        })
      ).not.toThrow()

      expect(() =>
        assertProductMutationPermissions(['*'], {
          isDelete: true,
          hasPriceChanges: true,
        })
      ).not.toThrow()
    })

    it('blocks price mutations if caller lacks products.manage_prices', () => {
      expect(() =>
        assertProductMutationPermissions(['products.update'], {
          isUpdate: true,
          hasPriceChanges: true,
        })
      ).toThrow("Forbidden: Missing required permission 'products.manage_prices'")
    })

    it('blocks barcode mutations if caller lacks products.manage_barcodes', () => {
      expect(() =>
        assertProductMutationPermissions(['products.update'], {
          isUpdate: true,
          hasBarcodeChanges: true,
        })
      ).toThrow("Forbidden: Missing required permission 'products.manage_barcodes'")
    })

    it('blocks variant mutations if caller lacks products.manage_variants', () => {
      expect(() =>
        assertProductMutationPermissions(['products.update'], {
          isUpdate: true,
          hasVariantChanges: true,
        })
      ).toThrow("Forbidden: Missing required permission 'products.manage_variants'")
    })

    it('blocks delete if caller lacks products.delete', () => {
      expect(() =>
        assertProductMutationPermissions(['products.update'], {
          isDelete: true,
        })
      ).toThrow("Forbidden: Missing required permission 'products.delete'")
    })
  })
})



