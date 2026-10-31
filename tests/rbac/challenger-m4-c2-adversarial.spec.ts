// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => {
  const mockClient: any = {
    products: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product_variants: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    product_barcodes: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    product_suppliers: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    price_list: {
      findFirst: vi.fn(),
    },
    price_list_items: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    categories: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    suppliers: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    warehouses: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    brands: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    uoms: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    tenant_user_branches: {
      findMany: vi.fn(),
    },
    tenant_user_warehouses: {
      findMany: vi.fn(),
    },
    tenant_users: {
      findFirst: vi.fn(),
    },
    tenants: {
      findFirst: vi.fn(),
    },
    roles: {
      findMany: vi.fn(),
    },
    inventory_items: {
      create: vi.fn(),
    },
    security_audit_logs: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: any) =>
      typeof fn === 'function' ? fn(mockClient) : Promise.all(fn)
    ),
    $queryRaw: vi.fn().mockResolvedValue([{ code: 'PRD-000001' }]),
  }
  return {
    default: mockClient,
  }
})

vi.mock('@/server/services/business-event-notifications', () => ({
  BusinessEventNotifications: {
    notifyProductCreated: vi.fn().mockResolvedValue(undefined),
    notifyProductUpdated: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/server/logging/security-audit', () => ({
  logSensitiveOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/hooks/use-auth', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: '33333333-3333-4333-8333-333333333333' } }),
}))

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    isLoading: false,
    data: { permissions: ['products.view'] },
    canAccessScreen: () => true,
  }),
}))

import {
  assertProductMutationPermissions,
  updateProductPrices,
  updateProductVariants,
  manageProductBarcodes,
  exportProducts,
  printProductLabels,
  createProductMaster,
  updateProductMaster,
  deleteProductMaster,
} from '@/server/fns/products'
import {
  PermissionRegistry,
  type ModuleManifest,
} from '@/lib/rbac/registry'
import {
  parseCsvRecords,
  executeProductImport,
} from '@/server/fns/product-import'
import { getMePermissions } from '@/server/fns/me-permissions'
import { ScreenGate } from '@/components/rbac/permission-gate'
import { hasPermission as rbacHasPermission } from '@/features/users/data/rbac'
import * as authUtils from '@/server/utils/auth'
import * as tenantUtils from '@/server/utils/tenant'
import { ApiError } from '@/server/utils/api-error'
import type { AuthorizedContext } from '@/server/utils/with-server-fn-auth'

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'
const AUTH_USER_ID = '33333333-3333-4333-8333-333333333333'
const TENANT_USER_ID = '44444444-4444-4444-8444-444444444444'

describe('Challenger M4 Adversarial Stress Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(tenantUtils, 'requireTenantId').mockResolvedValue(TENANT_A)
    vi.spyOn(tenantUtils, 'resolveTenantUserId').mockResolvedValue(TENANT_USER_ID)
    vi.spyOn(tenantUtils, 'resolveTenantId').mockResolvedValue(TENANT_A)
    vi.spyOn(authUtils, 'getDatabasePermissionNames').mockResolvedValue({
      roleNames: ['staff'],
      roleIds: ['role-staff'],
      permissionNames: ['products.view'],
      tenantUserId: TENANT_USER_ID,
      branchId: 'branch-1',
      warehouseId: 'wh-1',
      isBlocked: false,
    })
  })

  // ===========================================================================
  // SECTION 1: Product Mutation Endpoint Protections
  // ===========================================================================
  describe('Area 1: Product Mutation Endpoint Protections (Granular Permissions)', () => {
    describe('1.1 assertProductMutationPermissions() granularity & failure modes', () => {
      it('rejects create when products.create is absent (HTTP 403)', () => {
        expect(() => {
          assertProductMutationPermissions(['products.view'], { isCreate: true })
        }).toThrow(ApiError)

        try {
          assertProductMutationPermissions(['products.view'], { isCreate: true })
        } catch (err: any) {
          expect(err.status).toBe(403)
          expect(err.message).toContain('products.create')
        }
      })

      it('rejects update when products.update is absent (HTTP 403)', () => {
        expect(() => {
          assertProductMutationPermissions(['products.view'], { isUpdate: true })
        }).toThrow(ApiError)

        try {
          assertProductMutationPermissions(['products.view'], { isUpdate: true })
        } catch (err: any) {
          expect(err.status).toBe(403)
          expect(err.message).toContain('products.update')
        }
      })

      it('rejects delete when products.delete is absent (HTTP 403)', () => {
        expect(() => {
          assertProductMutationPermissions(
            ['products.view', 'products.create', 'products.update'],
            { isDelete: true }
          )
        }).toThrow(ApiError)

        try {
          assertProductMutationPermissions(['products.view'], { isDelete: true })
        } catch (err: any) {
          expect(err.status).toBe(403)
          expect(err.message).toContain('products.delete')
        }
      })

      it('rejects price mutation when products.manage_prices is absent (HTTP 403)', () => {
        expect(() => {
          assertProductMutationPermissions(['products.update'], {
            isUpdate: true,
            hasPriceChanges: true,
          })
        }).toThrow(ApiError)

        try {
          assertProductMutationPermissions(['products.update'], {
            isUpdate: true,
            hasPriceChanges: true,
          })
        } catch (err: any) {
          expect(err.status).toBe(403)
          expect(err.message).toContain('products.manage_prices')
        }
      })

      it('rejects variant mutation when products.manage_variants is absent (HTTP 403)', () => {
        expect(() => {
          assertProductMutationPermissions(['products.update'], {
            isUpdate: true,
            hasVariantChanges: true,
          })
        }).toThrow(ApiError)

        try {
          assertProductMutationPermissions(['products.update'], {
            isUpdate: true,
            hasVariantChanges: true,
          })
        } catch (err: any) {
          expect(err.status).toBe(403)
          expect(err.message).toContain('products.manage_variants')
        }
      })

      it('rejects barcode mutation when products.manage_barcodes is absent (HTTP 403)', () => {
        expect(() => {
          assertProductMutationPermissions(['products.update'], {
            isUpdate: true,
            hasBarcodeChanges: true,
          })
        }).toThrow(ApiError)

        try {
          assertProductMutationPermissions(['products.update'], {
            isUpdate: true,
            hasBarcodeChanges: true,
          })
        } catch (err: any) {
          expect(err.status).toBe(403)
          expect(err.message).toContain('products.manage_barcodes')
        }
      })

      it('allows granular mutations when caller holds the exact granular permissions', () => {
        expect(() => {
          assertProductMutationPermissions(
            [
              'products.update',
              'products.manage_prices',
              'products.manage_variants',
              'products.manage_barcodes',
            ],
            {
              isUpdate: true,
              hasPriceChanges: true,
              hasVariantChanges: true,
              hasBarcodeChanges: true,
            }
          )
        }).not.toThrow()
      })

      it('allows all operations when caller holds products.manage or *', () => {
        expect(() => {
          assertProductMutationPermissions(['products.manage'], {
            isCreate: true,
            isUpdate: true,
            isDelete: true,
            hasPriceChanges: true,
            hasVariantChanges: true,
            hasBarcodeChanges: true,
          })
        }).not.toThrow()

        expect(() => {
          assertProductMutationPermissions(['*'], {
            isCreate: true,
            isUpdate: true,
            isDelete: true,
            hasPriceChanges: true,
            hasVariantChanges: true,
            hasBarcodeChanges: true,
          })
        }).not.toThrow()
      })
    })

    describe('1.2 Granular mutation domain functions', () => {
      it('updateProductPrices() throws 403 without products.manage_prices', async () => {
        await expect(
          updateProductPrices(
            AUTH_USER_ID,
            'prod-001',
            { price: 19.99 },
            { permissions: ['products.view', 'products.update'] }
          )
        ).rejects.toThrow(ApiError)
      })

      it('updateProductVariants() throws 403 without products.manage_variants', async () => {
        await expect(
          updateProductVariants(
            AUTH_USER_ID,
            'prod-001',
            [{ sku: 'SKU-NEW-VAR' }],
            { permissions: ['products.view', 'products.update'] }
          )
        ).rejects.toThrow(ApiError)
      })

      it('manageProductBarcodes() throws 403 without products.manage_barcodes', async () => {
        await expect(
          manageProductBarcodes(
            AUTH_USER_ID,
            { productVariantId: 'var-1', barcode: '123456789012' },
            { permissions: ['products.view', 'products.update'] }
          )
        ).rejects.toThrow(ApiError)
      })

      it('deleteProductMaster() throws 403 without products.delete', async () => {
        await expect(
          deleteProductMaster(AUTH_USER_ID, 'prod-001', {
            permissions: ['products.view', 'products.update'],
          })
        ).rejects.toThrow(ApiError)
      })

      it('exportProducts() throws 403 without products.export or products.view', async () => {
        await expect(
          exportProducts(AUTH_USER_ID, {}, { permissions: ['inventory.stock.view'] })
        ).rejects.toThrow(ApiError)
      })

      it('printProductLabels() throws 403 without products.print or products.view', async () => {
        await expect(
          printProductLabels(AUTH_USER_ID, { productId: 'prod-001' }, {
            permissions: ['inventory.stock.view'],
          })
        ).rejects.toThrow(ApiError)
      })
    })

    describe('1.3 createProductMaster & updateProductMaster integration enforcement', () => {
      it('createProductMaster rejects variant price additions when lacking products.manage_prices', async () => {
        await expect(
          createProductMaster(
            AUTH_USER_ID,
            {
              name: 'Test Product',
              sku: 'SKU-PRICE-TEST',
              variants: [{ sku: 'SKU-PRICE-TEST-1', price: 25.0 }],
            },
            { permissions: ['products.create'] }
          )
        ).rejects.toThrow(/products\.manage_prices/)
      })

      it('createProductMaster rejects multiple variants when lacking products.manage_variants', async () => {
        await expect(
          createProductMaster(
            AUTH_USER_ID,
            {
              name: 'Multi Variant Product',
              sku: 'SKU-MULTI-TEST',
              variants: [
                { sku: 'SKU-MULTI-TEST-1' },
                { sku: 'SKU-MULTI-TEST-2' },
              ],
            },
            { permissions: ['products.create'] }
          )
        ).rejects.toThrow(/products\.manage_variants/)
      })

      it('createProductMaster rejects barcode addition when lacking products.manage_barcodes', async () => {
        await expect(
          createProductMaster(
            AUTH_USER_ID,
            {
              name: 'Barcode Product',
              sku: 'SKU-BARCODE-TEST',
              barcode: '999888777666',
            },
            { permissions: ['products.create'] }
          )
        ).rejects.toThrow(/products\.manage_barcodes/)
      })

      it('updateProductMaster rejects price alterations when lacking products.manage_prices', async () => {
        await expect(
          updateProductMaster(
            AUTH_USER_ID,
            '55555555-5555-4555-8555-555555555555',
            {
              variants: [{ sku: 'VAR-1', price: 99.99 }],
            },
            { permissions: ['products.update'] }
          )
        ).rejects.toThrow(/products\.manage_prices/)
      })

      it('updateProductMaster rejects barcode alteration when lacking products.manage_barcodes', async () => {
        await expect(
          updateProductMaster(
            AUTH_USER_ID,
            '55555555-5555-4555-8555-555555555555',
            { barcode: '112233445566' },
            { permissions: ['products.update'] }
          )
        ).rejects.toThrow(/products\.manage_barcodes/)
      })

      it('deleteProductMaster throws 400 on non-UUID product ID', async () => {
        await expect(
          deleteProductMaster(AUTH_USER_ID, 'non-uuid-id', {
            permissions: ['products.delete'],
          })
        ).rejects.toThrow(/Valid product ID is required/)
      })
    })
  })

  // ===========================================================================
  // SECTION 2: Permission Registry & Access Computation
  // ===========================================================================
  describe('Area 2: Permission Registry & Access Computation', () => {
    const registry = PermissionRegistry.getInstance()

    it('2.1 Default DENY: empty permission array results in 0 accessible modules, all screens false', () => {
      const access = registry.computeUserAccess([])

      expect(access.modules).toHaveLength(0)
      expect(access.screens['/products']).toBe(false)
      expect(access.screens['/inventory']).toBe(false)
      expect(access.screens['/users']).toBe(false)

      // Buttons on products screen must adhere to defaultAction (hide -> hidden, disable -> disabled)
      expect(access.buttons['products']['add_product']).toBe('hidden')
      expect(access.buttons['products']['edit_product']).toBe('disabled')
      expect(access.buttons['products']['delete_product']).toBe('hidden')
      expect(access.buttons['products']['export_csv']).toBe('disabled')
      expect(access.buttons['products']['import_csv']).toBe('hidden')
      expect(access.buttons['products']['print_barcodes']).toBe('disabled')
    })

    it('2.2 SuperAdmin and Wildcard (*): grants full access to all modules, screens, and action buttons', () => {
      const wildcardAccess = registry.computeUserAccess(['*'])
      const superAdminAccess = registry.computeUserAccess([], true)

      for (const acc of [wildcardAccess, superAdminAccess]) {
        expect(acc.modules.length).toBeGreaterThanOrEqual(7)
        expect(acc.modules).toContain('products')
        expect(acc.modules).toContain('purchasing')
        expect(acc.modules).toContain('inventory')
        expect(acc.modules).toContain('sales')
        expect(acc.modules).toContain('pos')
        expect(acc.modules).toContain('access_control')

        expect(acc.screens['/products']).toBe(true)
        expect(acc.screens['/users']).toBe(true)
        expect(acc.screens['/purchase-orders']).toBe(true)

        // All action buttons must be visible
        for (const screenCode of Object.keys(acc.buttons)) {
          for (const btnCode of Object.keys(acc.buttons[screenCode])) {
            expect(acc.buttons[screenCode][btnCode]).toBe('visible')
          }
        }
      }
    })

    it('2.3 Module Wildcard products.* grants all product screens and buttons while isolating other modules', () => {
      const access = registry.computeUserAccess(['products.*'])

      expect(access.modules).toContain('products')
      expect(access.screens['/products']).toBe(true)
      expect(access.screens['products']).toBe(true)

      // All product buttons visible
      expect(access.buttons['products']['add_product']).toBe('visible')
      expect(access.buttons['products']['edit_product']).toBe('visible')
      expect(access.buttons['products']['delete_product']).toBe('visible')
      expect(access.buttons['products']['export_csv']).toBe('visible')
      expect(access.buttons['products']['import_csv']).toBe('visible')
      expect(access.buttons['products']['print_barcodes']).toBe('visible')

      // Other modules must be blocked
      expect(access.modules).not.toContain('purchasing')
      expect(access.modules).not.toContain('access_control')
      expect(access.screens['/users']).toBe(false)
      expect(access.screens['/purchase-orders']).toBe(false)
    })

    it('2.4 Segment Wildcard inventory.purchasing.* grants purchasing screens but not stock screens', () => {
      const access = registry.computeUserAccess(['inventory.purchasing.*'])

      expect(access.modules).toContain('purchasing')
      expect(access.screens['/purchase-orders']).toBe(true)
      expect(access.screens['/purchase-requisitions']).toBe(true)
      expect(access.screens['/goods-receipts']).toBe(true)

      // Inventory stock screen must be denied
      expect(access.screens['/inventory']).toBe(false)
      expect(access.modules).not.toContain('inventory')
    })

    it('2.5 Fine-grained Action Button State Computation based on user permissions', () => {
      // User with view and export only
      const viewerWithExport = registry.computeUserAccess([
        'products.view',
        'products.export',
      ])

      expect(viewerWithExport.screens['/products']).toBe(true)
      expect(viewerWithExport.buttons['products']['export_csv']).toBe('visible')
      expect(viewerWithExport.buttons['products']['add_product']).toBe('hidden')
      expect(viewerWithExport.buttons['products']['edit_product']).toBe('disabled')
      expect(viewerWithExport.buttons['products']['delete_product']).toBe('hidden')
      expect(viewerWithExport.buttons['products']['import_csv']).toBe('hidden')
      expect(viewerWithExport.buttons['products']['print_barcodes']).toBe('disabled')
    })

    it('2.6 Implied Permission Expansion: products.manage implies standard mutations but excludes view_cost', () => {
      const access = registry.computeUserAccess(['products.manage'])

      expect(access.modules).toContain('products')
      expect(access.screens['/products']).toBe(true)
      expect(access.buttons['products']['add_product']).toBe('visible')
      expect(access.buttons['products']['edit_product']).toBe('visible')
      expect(access.buttons['products']['delete_product']).toBe('visible')
      expect(access.buttons['products']['export_csv']).toBe('visible')
      expect(access.buttons['products']['import_csv']).toBe('visible')
      expect(access.buttons['products']['print_barcodes']).toBe('visible')

      // products.view_cost is NOT implied by products.manage
      expect(rbacHasPermission(['products.manage'], 'products.view_cost')).toBe(false)
      expect(rbacHasPermission(['products.manage'], 'products.create')).toBe(true)
      expect(rbacHasPermission(['products.manage'], 'products.manage_prices')).toBe(true)

      const valid = registry.validatePermissions(['products.view_cost', 'products.manage_prices'])
      expect(valid.valid).toContain('products.view_cost')
      expect(valid.valid).toContain('products.manage_prices')
    })

    it('2.7 Dynamic Module Registration & Idempotency', () => {
      const customManifest: ModuleManifest = {
        code: 'analytics_test',
        name: 'Custom Analytics',
        permissions: [
          { name: 'analytics.reports.view', label: 'View Reports' },
          { name: 'analytics.reports.export', label: 'Export Reports' },
        ],
        screens: [
          {
            code: 'analytics_dashboard',
            name: 'Analytics Dashboard',
            route: '/analytics/dashboard',
            requiredPermission: 'analytics.reports.view',
            actionButtons: [
              {
                code: 'export_report',
                permission: 'analytics.reports.export',
                defaultAction: 'disable',
              },
            ],
          },
        ],
      }

      registry.registerModule(customManifest)
      expect(registry.getModule('analytics_test')).toBeDefined()
      expect(registry.getScreenByRoute('/analytics/dashboard')).toBeDefined()

      // User with analytics.reports.view can view screen, button disabled
      const userAccess1 = registry.computeUserAccess(['analytics.reports.view'])
      expect(userAccess1.modules).toContain('analytics_test')
      expect(userAccess1.screens['/analytics/dashboard']).toBe(true)
      expect(userAccess1.buttons['analytics_dashboard']['export_report']).toBe('disabled')

      // User with export also sees button visible
      const userAccess2 = registry.computeUserAccess([
        'analytics.reports.view',
        'analytics.reports.export',
      ])
      expect(userAccess2.buttons['analytics_dashboard']['export_report']).toBe('visible')

      // Idempotent re-registration updates without duplication
      registry.registerModule(customManifest)
      expect(registry.getScreensForModule('analytics_test')).toHaveLength(1)
    })

    it('2.8 validatePermissions distinguishes catalog permissions from invalid arbitrary inputs', () => {
      const { valid, invalid } = registry.validatePermissions([
        'products.view',
        'products.manage_prices',
        '*',
        'invalid.permission.exploit',
        'arbitrary.text',
      ])

      expect(valid).toContain('products.view')
      expect(valid).toContain('products.manage_prices')
      expect(valid).toContain('*')
      expect(invalid).toContain('invalid.permission.exploit')
      expect(invalid).toContain('arbitrary.text')
    })
  })

  // ===========================================================================
  // SECTION 3: CSV Import RFC-4180 Parsing & Cross-Tenant Isolation
  // ===========================================================================
  describe('Area 3: CSV Import RFC-4180 Parsing & Cross-Tenant Isolation', () => {
    describe('3.1 RFC-4180 Parser edge cases (BOM, unclosed quotes, commas, escapes)', () => {
      it('strips UTF-8 BOM cleanly from header without corrupting column name', () => {
        const bomCsv = '\uFEFFname,sku,selling_price\nWidget A,WIDGET-01,10.50'
        const parsed = parseCsvRecords(bomCsv)

        expect(parsed.headers).toEqual(['name', 'sku', 'selling_price'])
        expect(parsed.rows).toHaveLength(1)
        expect(parsed.rows[0].data.name).toBe('Widget A')
        expect(parsed.rows[0].data.sku).toBe('WIDGET-01')
        expect(parsed.rows[0].data.selling_price).toBe('10.50')
      })

      it('handles unclosed quotes without hanging, crashing, or throwing unhandled exception', () => {
        const malformedCsv = 'name,sku\n"Unclosed Product Name,SKU-001\nValid Product,SKU-002'
        expect(() => {
          const parsed = parseCsvRecords(malformedCsv)
          expect(parsed.rows.length).toBeGreaterThanOrEqual(1)
        }).not.toThrow()
      })

      it('handles escaped double quotes ("") properly inside fields', () => {
        const csv = 'name,sku\n"Widget ""Heavy Duty"" 100mm",SKU-HD-100'
        const parsed = parseCsvRecords(csv)

        expect(parsed.rows).toHaveLength(1)
        expect(parsed.rows[0].data.name).toBe('Widget "Heavy Duty" 100mm')
        expect(parsed.rows[0].data.sku).toBe('SKU-HD-100')
      })

      it('handles embedded commas and CRLF newlines within quoted fields', () => {
        const csv = 'name,description,sku\r\n"Item, Multi","Line 1\r\nLine 2",SKU-CRLF'
        const parsed = parseCsvRecords(csv)

        expect(parsed.rows).toHaveLength(1)
        expect(parsed.rows[0].data.name).toBe('Item, Multi')
        expect(parsed.rows[0].data.description).toContain('Line 1')
        expect(parsed.rows[0].data.sku).toBe('SKU-CRLF')
      })

      it('handles empty CSV or whitespace-only CSV gracefully with empty result', () => {
        const empty1 = parseCsvRecords('')
        const empty2 = parseCsvRecords('   \r\n\r\n   ')

        expect(empty1.headers).toHaveLength(0)
        expect(empty1.rows).toHaveLength(0)
        expect(empty2.headers).toHaveLength(0)
        expect(empty2.rows).toHaveLength(0)
      })

      it('normalizes headers with mixed casing, spaces, and dashes to snake_case', () => {
        const csv = 'Product Name,SKU - Code,Selling-Price,Base UOM ID\nItem 1,SKU-1,10,uom-1'
        const parsed = parseCsvRecords(csv)

        expect(parsed.headers).toContain('product_name')
        expect(parsed.headers).toContain('sku_code')
        expect(parsed.headers).toContain('selling_price')
        expect(parsed.headers).toContain('base_uom_id')
      })
    })

    describe('3.2 executeProductImport() Tenant Isolation, Constraints & Atomicity', () => {
      const mockAuthContext: AuthorizedContext = {
        user: {
          userId: AUTH_USER_ID,
          tenantId: TENANT_A,
          roleNames: ['admin'],
          permissionNames: ['products.import'],
        },
        tenantId: TENANT_A,
        tenantUserId: TENANT_USER_ID,
        branchIds: ['branch-1'],
        warehouseIds: ['wh-1'],
        dataScope: 'TENANT',
        scopeContext: {
          tenantId: TENANT_A,
          tenantUserId: TENANT_USER_ID,
          authUserId: AUTH_USER_ID,
          branchIds: ['branch-1'],
          warehouseIds: ['wh-1'],
          dataScope: 'TENANT',
          isSuperAdmin: false,
        },
        tenantPrisma: prisma,
        scopeFilter: ((_: any, existing: any) => existing || {}) as any,
      }

      it('cross-tenant category injection: strictly rejects import referencing Tenant B category', async () => {
        const foreignCategoryId = '99999999-9999-4999-8999-999999999999'

        // Mock DB: categories.findMany returns empty for foreign ID under Tenant A
        ;(prisma.categories.findMany as any).mockResolvedValue([])
        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const csvContent = `name,sku,category_id\nInfiltrator Product,SKU-X-1,${foreignCategoryId}`
        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.importedCount).toBe(0)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].row).toBe(2)
        expect(result.errors[0].field).toBe('category_id')
        expect(result.errors[0].error).toContain('belongs to another organization')

        // Must not commit any database writes
        expect(prisma.products.create).not.toHaveBeenCalled()
      })

      it('cross-tenant supplier injection: strictly rejects import referencing foreign supplier', async () => {
        const foreignSupplierId = '88888888-8888-4888-8888-888888888888'

        ;(prisma.suppliers.findMany as any).mockResolvedValue([])
        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const csvContent = `name,sku,supplier_id\nForeign Supplier Product,SKU-SUP-1,${foreignSupplierId}`
        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.importedCount).toBe(0)
        expect(result.errors[0].field).toBe('supplier_id')
        expect(result.errors[0].error).toContain('belongs to another organization')
      })

      it('cross-tenant warehouse injection: strictly rejects import referencing foreign warehouse', async () => {
        const foreignWarehouseId = '77777777-7777-4777-8777-777777777777'

        ;(prisma.warehouses.findMany as any).mockResolvedValue([])
        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const csvContent = `name,sku,warehouse_id\nForeign Warehouse Product,SKU-WH-1,${foreignWarehouseId}`
        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.importedCount).toBe(0)
        expect(result.errors[0].field).toBe('warehouse_id')
        expect(result.errors[0].error).toContain('belongs to another organization')
      })

      it('detects invalid UUID strings in FK fields upfront without crashing query engine', async () => {
        const csvContent = 'name,sku,category_id\nProduct 1,SKU-BAD-UUID,not-a-valid-uuid'
        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.errors[0].field).toBe('category_id')
        expect(result.errors[0].error).toContain('Invalid UUID format')
      })

      it('detects duplicate SKUs within the same CSV batch', async () => {
        const csvContent = [
          'name,sku',
          'Item 1,SKU-BATCH-DUP',
          'Item 2,SKU-UNIQUE',
          'Item 3,SKU-BATCH-DUP', // Duplicate on line 4 (row 4)
        ].join('\n')

        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].row).toBe(4)
        expect(result.errors[0].field).toBe('sku')
        expect(result.errors[0].error).toContain("Duplicate SKU 'SKU-BATCH-DUP' found in row 2")
      })

      it('detects duplicate barcodes within the same CSV batch', async () => {
        const csvContent = [
          'name,sku,barcode',
          'Item 1,SKU-1,111222333',
          'Item 2,SKU-2,111222333', // Duplicate barcode on row 3
        ].join('\n')

        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.errors[0].field).toBe('barcode')
        expect(result.errors[0].error).toContain("Duplicate barcode '111222333' found in row 2")
      })

      it('detects duplicate SKU against existing tenant database records', async () => {
        ;(prisma.products.findMany as any).mockResolvedValue([{ sku: 'EXISTING-DB-SKU' }])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const csvContent = 'name,sku\nItem DB Dup,EXISTING-DB-SKU'
        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.errors[0].field).toBe('sku')
        expect(result.errors[0].error).toContain('already exists in your organization')
      })

      it('rejects negative numeric values (price, cost, stock, weight)', async () => {
        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const csvContent = [
          'name,sku,selling_price,cost_price,initial_stock,weight',
          'Bad Numbers,SKU-NEG,-15,-5,-1,-0.5',
        ].join('\n')

        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(4)
        const fields = result.errors.map((e) => e.field)
        expect(fields).toContain('selling_price')
        expect(fields).toContain('cost_price')
        expect(fields).toContain('initial_stock')
        expect(fields).toContain('weight')
      })

      it('enforces atomic rollback: failure in 1 row aborts the entire batch with 0 writes', async () => {
        ;(prisma.categories.findMany as any).mockResolvedValue([])
        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])

        const csvContent = [
          'name,sku',
          'Valid Item 1,SKU-VAL-1',
          'Valid Item 2,SKU-VAL-2',
          'Valid Item 3,SKU-VAL-3',
          ',SKU-INVALID-NAME', // Row 5 is missing name!
          'Valid Item 5,SKU-VAL-5',
        ].join('\n')

        const result = await executeProductImport({ csvContent }, mockAuthContext)

        expect(result.success).toBe(false)
        expect(result.importedCount).toBe(0)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].row).toBe(5)
        expect(result.errors[0].field).toBe('name')

        // Transaction write must NOT have occurred
        expect(prisma.products.create).not.toHaveBeenCalled()
      })

      it('handles CSV formula injection payloads safely without command or code execution', async () => {
        ;(prisma.products.findMany as any).mockResolvedValue([])
        ;(prisma.product_variants.findMany as any).mockResolvedValue([])
        ;(prisma.product_barcodes.findMany as any).mockResolvedValue([])
        ;(prisma.products.create as any).mockResolvedValue({ id: 'prod-formula-1' })
        ;(prisma.product_variants.create as any).mockResolvedValue({ id: 'var-formula-1' })

        const csvContent = [
          'name,sku,description',
          '"=cmd|\' /C calc\'!A0",SKU-FORMULA,"@SUM(1+1)"',
        ].join('\n')

        const result = await executeProductImport({ csvContent }, mockAuthContext)

        // Formulas in text fields are safely imported as literal strings
        expect(result.success).toBe(true)
        expect(result.importedCount).toBe(1)
        expect(prisma.products.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: "=cmd|' /C calc'!A0",
              sku: 'SKU-FORMULA',
              description: '@SUM(1+1)',
            }),
          })
        )
      })
    })
  })

  // ===========================================================================
  // SECTION 4: /api/me/permissions Contract & ABAC Scopes
  // ===========================================================================
  describe('Area 4: /api/me/permissions Contract & ABAC Scopes', () => {
    it('4.1 Anonymous / unauthenticated caller returns clean zero-privilege contract', async () => {
      const response = await getMePermissions({ authUserId: '' })

      expect(response.success).toBe(true)
      expect(response.data.userId).toBe('')
      expect(response.data.tenantId).toBeNull()
      expect(response.data.roles).toHaveLength(0)
      expect(response.data.permissions).toHaveLength(0)
      expect(response.data.isSuperAdmin).toBe(false)
      expect(response.data.isOwner).toBe(false)
      expect(response.data.modules).toHaveLength(0)
      expect(response.data.scopes.branchIds).toHaveLength(0)
      expect(response.data.scopes.warehouseIds).toHaveLength(0)
      expect(response.data.scopes.ownRecordsOnly).toBe(false)
    })

    it('4.2 Blocked user returns empty roles, empty permissions, and zero access', async () => {
      vi.spyOn(authUtils, 'getDatabasePermissionNames').mockResolvedValue({
        roleNames: ['admin'],
        roleIds: ['role-1'],
        permissionNames: ['products.view', 'products.delete'],
        tenantUserId: TENANT_USER_ID,
        branchId: 'branch-1',
        warehouseId: 'wh-1',
        isBlocked: true, // Blocked user
      })

      const response = await getMePermissions({ authUserId: AUTH_USER_ID, tenantId: TENANT_A })

      expect(response.success).toBe(true)
      expect(response.data.roles).toHaveLength(0)
      expect(response.data.permissions).toHaveLength(0)
      expect(response.data.modules).toHaveLength(0)
      expect(response.data.screens).toEqual({})
      expect(response.data.buttons).toEqual({})
    })

    it('4.3 SuperAdmin resolves isSuperAdmin: true, full module catalog, and visible buttons', async () => {
      vi.spyOn(authUtils, 'getDatabasePermissionNames').mockResolvedValue({
        roleNames: ['super_admin'],
        roleIds: ['role-super'],
        permissionNames: ['*'],
        tenantUserId: TENANT_USER_ID,
        branchId: null,
        warehouseId: null,
        isBlocked: false,
      })

      const response = await getMePermissions({ authUserId: AUTH_USER_ID, tenantId: TENANT_A })

      expect(response.success).toBe(true)
      expect(response.data.isSuperAdmin).toBe(true)
      expect(response.data.roles).toContain('super_admin')
      expect(response.data.permissions).toContain('*')
      expect(response.data.modules).toContain('products')
      expect(response.data.modules).toContain('purchasing')
      expect(response.data.screens['/products']).toBe(true)
      expect(response.data.buttons['products']['add_product']).toBe('visible')
      expect(response.data.buttons['products']['delete_product']).toBe('visible')
    })

    it('4.4 Owner resolution via role or tenant record resolves isOwner: true', async () => {
      vi.spyOn(authUtils, 'getDatabasePermissionNames').mockResolvedValue({
        roleNames: ['owner'],
        roleIds: ['role-owner'],
        permissionNames: ['products.view'],
        tenantUserId: TENANT_USER_ID,
        branchId: null,
        warehouseId: null,
        isBlocked: false,
      })

      const response = await getMePermissions({ authUserId: AUTH_USER_ID, tenantId: TENANT_A })
      expect(response.data.isOwner).toBe(true)
    })

    it('4.5 ABAC Scopes resolution from companion junction tables (branches, warehouses, ownRecordsOnly)', async () => {
      ;(prisma.tenant_user_branches.findMany as any).mockResolvedValue([
        { branch_id: 'branch-alpha' },
        { branch_id: 'branch-beta' },
      ])
      ;(prisma.tenant_user_warehouses.findMany as any).mockResolvedValue([
        { warehouse_id: 'wh-north' },
        { warehouse_id: 'wh-south' },
      ])
      ;(prisma.roles.findMany as any).mockResolvedValue([
        { data_scope: 'OWN_RECORDS' },
      ])

      vi.spyOn(authUtils, 'getDatabasePermissionNames').mockResolvedValue({
        roleNames: ['staff'],
        roleIds: ['role-staff'],
        permissionNames: ['products.view'],
        tenantUserId: TENANT_USER_ID,
        branchId: 'branch-fallback',
        warehouseId: 'wh-fallback',
        isBlocked: false,
      })

      const response = await getMePermissions({ authUserId: AUTH_USER_ID, tenantId: TENANT_A })

      expect(response.success).toBe(true)
      expect(response.data.scopes.branchIds).toEqual(['branch-alpha', 'branch-beta'])
      expect(response.data.scopes.warehouseIds).toEqual(['wh-north', 'wh-south'])
      expect(response.data.scopes.storeIds).toEqual(['branch-alpha', 'branch-beta'])
      expect(response.data.scopes.ownRecordsOnly).toBe(true)
    })

    it('4.6 Contract completeness check: all specified MePermissionsResponse keys exist and are typed', async () => {
      const response = await getMePermissions({ authUserId: AUTH_USER_ID, tenantId: TENANT_A })

      expect(response).toHaveProperty('success')
      expect(response).toHaveProperty('data')
      const d = response.data
      expect(d).toHaveProperty('userId')
      expect(d).toHaveProperty('tenantId')
      expect(d).toHaveProperty('tenantUserId')
      expect(d).toHaveProperty('roles')
      expect(d).toHaveProperty('isSuperAdmin')
      expect(d).toHaveProperty('isOwner')
      expect(d).toHaveProperty('permissions')
      expect(d).toHaveProperty('scopes')
      expect(d.scopes).toHaveProperty('tenantId')
      expect(d.scopes).toHaveProperty('branchIds')
      expect(d.scopes).toHaveProperty('warehouseIds')
      expect(d.scopes).toHaveProperty('storeIds')
      expect(d.scopes).toHaveProperty('ownRecordsOnly')
      expect(d).toHaveProperty('modules')
      expect(d).toHaveProperty('screens')
      expect(d).toHaveProperty('buttons')

      expect(Array.isArray(d.roles)).toBe(true)
      expect(Array.isArray(d.permissions)).toBe(true)
      expect(Array.isArray(d.modules)).toBe(true)
      expect(typeof d.screens).toBe('object')
      expect(typeof d.buttons).toBe('object')
    })
  })

  // ===========================================================================
  // SECTION 5: Declarative UI Gate Empirical Defect Reproduction
  // ===========================================================================
  describe('Area 5: Declarative UI Gate Empirical Verification (ScreenGate)', () => {
    it('5.1 executes ScreenGate safely without runtime ReferenceError', () => {
      // ScreenGate safely checks authenticated user and permission state without throwing
      expect(() => {
        ScreenGate({ screen: '/products', children: 'Protected Screen Content' })
      }).not.toThrow()
    })
  })
})
