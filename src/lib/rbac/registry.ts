/**
 * src/lib/rbac/registry.ts
 *
 * Centralized Permission Registry & Module Manifest architecture.
 * Decouples core authorization engine from application domain modules.
 */

import { hasPermission as rbacHasPermission } from '@/features/users/data/rbac'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ButtonDefaultAction = 'hide' | 'disable'
export type ActionButtonState = 'visible' | 'hidden' | 'disabled'

export interface PermissionDeclaration {
  id?: string
  name?: string
  module?: string
  resource?: string
  action?: string
  label?: string
  description?: string
  riskLevel?: RiskLevel
  isSensitive?: boolean
  impliedBy?: string[]
  dependencies?: string[]
}

export type ManifestPermission = PermissionDeclaration
export type PermissionDefinition = PermissionDeclaration

export interface ButtonDeclaration {
  id?: string
  code?: string
  label?: string
  screenId?: string
  screenCode?: string
  permission: string
  defaultAction?: ButtonDefaultAction
}

export type ManifestActionButton = ButtonDeclaration
export type ActionButtonDeclaration = ButtonDeclaration

export interface ScreenDeclaration {
  id?: string
  code?: string
  name?: string
  title?: string
  route?: string
  path?: string
  moduleId?: string
  moduleCode?: string
  icon?: string
  requiredPermission?: string
  requiredPermissions?: string[]
  requiredAllPermissions?: string[]
  sortOrder?: number
  actionButtons?: ButtonDeclaration[]
}

export type ManifestScreen = ScreenDeclaration
export type ScreenDefinition = ScreenDeclaration

export interface ModuleManifest {
  id?: string
  code?: string
  name?: string
  label?: string
  description?: string
  icon?: string
  defaultRoute?: string
  sortOrder?: number
  permissions: PermissionDeclaration[]
  screens: ScreenDeclaration[]
  actionButtons?: ButtonDeclaration[]
}

export interface ComputedUserAccess {
  modules: string[]
  screens: Record<string, boolean>
  buttons: Record<string, Record<string, ActionButtonState>>
}

export class PermissionRegistry {
  private static instance: PermissionRegistry
  private modules = new Map<string, ModuleManifest>()
  private permissions = new Map<string, PermissionDeclaration>()
  private screens = new Map<string, ScreenDeclaration>()
  private screensByPath = new Map<string, ScreenDeclaration>()
  private buttons = new Map<string, ButtonDeclaration>()
  private buttonsByScreen = new Map<string, ButtonDeclaration[]>()
  private screensByModule = new Map<string, ScreenDeclaration[]>()

  public constructor() {
    this.registerCoreManifests()
  }

  public static getInstance(): PermissionRegistry {
    if (!PermissionRegistry.instance) {
      PermissionRegistry.instance = new PermissionRegistry()
    }
    return PermissionRegistry.instance
  }

  /**
   * Register a module manifest. Idempotent: re-registration updates module definition.
   */
  public registerModule(manifest: ModuleManifest): void {
    const moduleCode = manifest.code || manifest.id || ''
    const moduleName = manifest.name || manifest.label || moduleCode

    const normalizedManifest: ModuleManifest = {
      ...manifest,
      code: moduleCode,
      id: moduleCode,
      name: moduleName,
      label: moduleName,
      screens: manifest.screens || [],
      permissions: manifest.permissions || [],
      actionButtons: manifest.actionButtons || [],
    }

    this.modules.set(moduleCode, normalizedManifest)

    // Index permissions
    for (const p of normalizedManifest.permissions) {
      const permName = p.name || p.id || ''
      const normalizedPerm: PermissionDeclaration = {
        ...p,
        id: permName,
        name: permName,
        label: p.label || permName,
        module: p.module || moduleCode,
      }
      this.permissions.set(permName, normalizedPerm)
    }

    // Index screens
    const moduleScreens: ScreenDeclaration[] = []
    for (const s of normalizedManifest.screens) {
      const screenCode = s.code || s.id || ''
      const screenRoute = s.route || s.path || ''
      const screenTitle = s.title || s.name || screenCode

      const requiredList: string[] = []
      if (s.requiredPermission) requiredList.push(s.requiredPermission)
      if (s.requiredPermissions) {
        for (const rp of s.requiredPermissions) {
          if (!requiredList.includes(rp)) requiredList.push(rp)
        }
      }

      const normalizedScreen: ScreenDeclaration = {
        ...s,
        id: screenCode,
        code: screenCode,
        name: screenTitle,
        title: screenTitle,
        path: screenRoute,
        route: screenRoute,
        moduleId: moduleCode,
        moduleCode,
        requiredPermission: requiredList[0] || '',
        requiredPermissions: requiredList,
      }

      this.screens.set(screenCode, normalizedScreen)
      if (screenRoute) {
        this.screensByPath.set(screenRoute, normalizedScreen)
      }
      moduleScreens.push(normalizedScreen)

      // Index screen action buttons defined inside screen
      if (s.actionButtons && s.actionButtons.length > 0) {
        for (const btn of s.actionButtons) {
          this.registerActionButton({ ...btn, screenId: screenCode, screenCode })
        }
      }
    }
    this.screensByModule.set(moduleCode, moduleScreens)

    // Index top-level action buttons
    if (normalizedManifest.actionButtons) {
      for (const btn of normalizedManifest.actionButtons) {
        this.registerActionButton(btn)
      }
    }
  }

  public register(manifest: ModuleManifest): void {
    this.registerModule(manifest)
  }

  public registerModules(manifests: ModuleManifest[]): void {
    for (const m of manifests) {
      this.registerModule(m)
    }
  }

  private registerActionButton(btn: ButtonDeclaration): void {
    const btnCode = btn.code || btn.id || ''
    const screenCode = btn.screenCode || btn.screenId || ''
    const normalizedBtn: ButtonDeclaration = {
      ...btn,
      id: btnCode,
      code: btnCode,
      screenId: screenCode,
      screenCode,
      defaultAction: btn.defaultAction || 'hide',
    }
    this.buttons.set(`${screenCode}:${btnCode}`, normalizedBtn)

    const list = this.buttonsByScreen.get(screenCode) || []
    if (!list.some((b) => (b.code || b.id) === btnCode)) {
      list.push(normalizedBtn)
    }
    this.buttonsByScreen.set(screenCode, list)
  }

  // ── Query APIs ─────────────────────────────────────────────────────────────

  public getModule(codeOrId: string): ModuleManifest | undefined {
    return this.modules.get(codeOrId)
  }

  public getAllModules(): ModuleManifest[] {
    return Array.from(this.modules.values()).sort(
      (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
    )
  }

  public getRegisteredModules(): ModuleManifest[] {
    return this.getAllModules()
  }

  public getAllPermissions(): PermissionDeclaration[] {
    return Array.from(this.permissions.values())
  }

  public getRegisteredPermissions(): PermissionDeclaration[] {
    return this.getAllPermissions()
  }

  public getAllScreens(): ScreenDeclaration[] {
    return Array.from(this.screens.values()).sort(
      (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
    )
  }

  public getRegisteredScreens(): ScreenDeclaration[] {
    return this.getAllScreens()
  }

  public getAllButtons(): ButtonDeclaration[] {
    return Array.from(this.buttons.values())
  }

  public getRegisteredButtons(): ButtonDeclaration[] {
    return this.getAllButtons()
  }

  public getScreensForModule(moduleCode: string): ScreenDeclaration[] {
    return this.screensByModule.get(moduleCode) || []
  }

  public getButtonsForScreen(screenCode: string): ButtonDeclaration[] {
    return this.buttonsByScreen.get(screenCode) || []
  }

  public getScreenByRoute(route: string): ScreenDeclaration | undefined {
    return this.screensByPath.get(route)
  }

  public getScreenByCode(code: string): ScreenDeclaration | undefined {
    return this.screens.get(code)
  }

  public getRequiredPermissionForScreen(screenCodeOrRoute: string): string | undefined {
    const screen = this.screens.get(screenCodeOrRoute) || this.screensByPath.get(screenCodeOrRoute)
    return screen?.requiredPermission || screen?.requiredPermissions?.[0]
  }

  public getRequiredPermissionsForScreen(screenCodeOrRoute: string): string[] {
    const screen = this.screens.get(screenCodeOrRoute) || this.screensByPath.get(screenCodeOrRoute)
    return screen ? screen.requiredPermissions || [] : []
  }

  public hasPermission(permissionId: string): boolean {
    return this.permissions.has(permissionId)
  }

  public validatePermissions(permissions: string[]): {
    valid: string[]
    invalid: string[]
  } {
    const valid: string[] = []
    const invalid: string[] = []
    for (const p of permissions) {
      if (p === '*' || this.permissions.has(p)) {
        valid.push(p)
      } else {
        invalid.push(p)
      }
    }
    return { valid, invalid }
  }

  // ── Authorization Resolution for UI & /api/me/permissions ──────────────────

  /**
   * Dynamically evaluate authorized modules, screens, and action buttons for a user.
   */
  public computeUserAccess(
    userPermissions: string[],
    isSuperAdmin = false
  ): ComputedUserAccess {
    const hasWildcard = isSuperAdmin || userPermissions.includes('*')

    const checkPerm = (required: string): boolean => {
      if (hasWildcard) return true
      return rbacHasPermission(userPermissions, required)
    }

    const accessibleModules: string[] = []
    const screenAccess: Record<string, boolean> = {}
    const buttonStates: Record<string, Record<string, ActionButtonState>> = {}

    for (const [moduleCode, _manifest] of this.modules) {
      let moduleHasAccess = false
      const moduleScreens = this.screensByModule.get(moduleCode) || []

      for (const screen of moduleScreens) {
        let isScreenAccessible = hasWildcard

        if (!isScreenAccessible) {
          const reqAny = screen.requiredPermissions || (screen.requiredPermission ? [screen.requiredPermission] : [])
          const reqAll = screen.requiredAllPermissions || []

          const anyPassed = reqAny.length === 0 || reqAny.some(checkPerm)
          const allPassed = reqAll.length === 0 || reqAll.every(checkPerm)
          isScreenAccessible = anyPassed && allPassed
        }

        const screenCode = screen.code || screen.id || ''
        const screenRoute = screen.route || screen.path || ''

        if (screenCode) {
          screenAccess[screenCode] = isScreenAccessible
        }
        if (screenRoute) {
          screenAccess[screenRoute] = isScreenAccessible
        }
        if (isScreenAccessible) {
          moduleHasAccess = true
        }

        // Compute button states for this screen
        const screenButtons = this.buttonsByScreen.get(screenCode) || []
        if (screenCode && !buttonStates[screenCode]) {
          buttonStates[screenCode] = {}
        }

        for (const btn of screenButtons) {
          const btnCode = btn.code || btn.id || ''
          if (!btnCode) continue
          const hasBtnPerm = checkPerm(btn.permission)
          if (hasBtnPerm) {
            buttonStates[screenCode][btnCode] = 'visible'
          } else {
            buttonStates[screenCode][btnCode] =
              btn.defaultAction === 'disable' ? 'disabled' : 'hidden'
          }
        }
      }

      if (moduleHasAccess || (hasWildcard && moduleScreens.length === 0)) {
        accessibleModules.push(moduleCode)
      }
    }

    return {
      modules: accessibleModules,
      screens: screenAccess,
      buttons: buttonStates,
    }
  }

  // ── Pre-registered Core Domain Manifests ────────────────────────────────────

  private registerCoreManifests(): void {
    // 1. Products Reference Module (11 granular permissions)
    this.registerModule({
      code: 'products',
      id: 'products',
      name: 'Products',
      label: 'Products',
      description: 'Product catalog, pricing, variants, barcodes, and imports',
      icon: 'Package',
      defaultRoute: '/products',
      sortOrder: 10,
      permissions: [
        { name: 'products.view', id: 'products.view', label: 'View Products', description: 'View product catalog and details', riskLevel: 'LOW' },
        { name: 'products.create', id: 'products.create', label: 'Create Product', description: 'Create new product masters', riskLevel: 'MEDIUM' },
        { name: 'products.update', id: 'products.update', label: 'Update Product', description: 'Modify existing product masters', riskLevel: 'MEDIUM' },
        { name: 'products.delete', id: 'products.delete', label: 'Delete Product', description: 'Delete or archive product records', riskLevel: 'HIGH' },
        { name: 'products.print', id: 'products.print', label: 'Print Barcodes', description: 'Print barcode labels and product catalogs', riskLevel: 'LOW' },
        { name: 'products.export', id: 'products.export', label: 'Export Products', description: 'Export products to CSV/Excel', riskLevel: 'MEDIUM' },
        { name: 'products.import', id: 'products.import', label: 'Import Products', description: 'Bulk import products via CSV', riskLevel: 'HIGH', isSensitive: true },
        { name: 'products.view_cost', id: 'products.view_cost', label: 'View Cost & Margin', description: 'View cost prices, purchase costs, and profit margins', riskLevel: 'CRITICAL', isSensitive: true },
        { name: 'products.manage_prices', id: 'products.manage_prices', label: 'Manage Prices', description: 'Update product selling prices and price lists', riskLevel: 'HIGH' },
        { name: 'products.manage_variants', id: 'products.manage_variants', label: 'Manage Variants', description: 'Create and modify variants and attribute values', riskLevel: 'MEDIUM' },
        { name: 'products.manage_barcodes', id: 'products.manage_barcodes', label: 'Manage Barcodes', description: 'Assign and modify product and variant barcodes', riskLevel: 'MEDIUM' },
      ],
      screens: [
        {
          code: 'products',
          id: 'products',
          name: 'Products',
          title: 'Product Catalog',
          route: '/products',
          path: '/products',
          moduleCode: 'products',
          requiredPermission: 'products.view',
          requiredPermissions: ['products.view'],
          sortOrder: 1,
          actionButtons: [
            { code: 'add_product', id: 'add_product', screenId: 'products', screenCode: 'products', permission: 'products.create', defaultAction: 'hide' },
            { code: 'edit_product', id: 'edit_product', screenId: 'products', screenCode: 'products', permission: 'products.update', defaultAction: 'disable' },
            { code: 'delete_product', id: 'delete_product', screenId: 'products', screenCode: 'products', permission: 'products.delete', defaultAction: 'hide' },
            { code: 'export_csv', id: 'export_csv', screenId: 'products', screenCode: 'products', permission: 'products.export', defaultAction: 'disable' },
            { code: 'import_csv', id: 'import_csv', screenId: 'products', screenCode: 'products', permission: 'products.import', defaultAction: 'hide' },
            { code: 'print_barcodes', id: 'print_barcodes', screenId: 'products', screenCode: 'products', permission: 'products.print', defaultAction: 'disable' },
          ],
        },
      ],
    })

    // 2. Purchasing Module
    this.registerModule({
      code: 'purchasing',
      id: 'purchasing',
      name: 'Purchasing',
      label: 'Purchasing',
      description: 'Purchase orders, requisitions, and goods receipts',
      icon: 'ShoppingBag',
      defaultRoute: '/purchase-orders',
      sortOrder: 20,
      permissions: [
        { name: 'inventory.purchasing.view', id: 'inventory.purchasing.view', label: 'View Purchasing', description: 'View purchase orders and goods receipts', riskLevel: 'LOW' },
        { name: 'inventory.purchasing.manage', id: 'inventory.purchasing.manage', label: 'Manage Purchasing', description: 'Create and edit purchase orders', riskLevel: 'HIGH' },
      ],
      screens: [
        { code: 'purchase_orders', id: 'purchase_orders', name: 'Purchase Orders', route: '/purchase-orders', path: '/purchase-orders', moduleCode: 'purchasing', requiredPermission: 'inventory.purchasing.view', requiredPermissions: ['inventory.purchasing.view'] },
        { code: 'purchase_requisitions', id: 'purchase_requisitions', name: 'Purchase Requisitions', route: '/purchase-requisitions', path: '/purchase-requisitions', moduleCode: 'purchasing', requiredPermission: 'inventory.purchasing.view', requiredPermissions: ['inventory.purchasing.view'] },
        { code: 'goods_receipts', id: 'goods_receipts', name: 'Goods Receipts', route: '/goods-receipts', path: '/goods-receipts', moduleCode: 'purchasing', requiredPermission: 'inventory.purchasing.view', requiredPermissions: ['inventory.purchasing.view'] },
      ],
    })

    // 3. Inventory Module
    this.registerModule({
      code: 'inventory',
      id: 'inventory',
      name: 'Inventory',
      label: 'Inventory',
      description: 'Stock balances, movements, counts, and valuation',
      icon: 'Boxes',
      defaultRoute: '/inventory',
      sortOrder: 30,
      permissions: [
        { name: 'inventory.stock.view', id: 'inventory.stock.view', label: 'View Stock', description: 'View stock balances and inventory states', riskLevel: 'LOW' },
        { name: 'inventory.stock.manage', id: 'inventory.stock.manage', label: 'Manage Stock', description: 'Adjust stock and inventory configuration', riskLevel: 'HIGH' },
      ],
      screens: [
        { code: 'stock_balances', id: 'stock_balances', name: 'Stock Balances', route: '/inventory', path: '/inventory', moduleCode: 'inventory', requiredPermission: 'inventory.stock.view', requiredPermissions: ['inventory.stock.view'] },
        { code: 'stock_adjustments', id: 'stock_adjustments', name: 'Stock Adjustments', route: '/stock-adjustments', path: '/stock-adjustments', moduleCode: 'inventory', requiredPermission: 'inventory.stock.manage', requiredPermissions: ['inventory.stock.manage'] },
        { code: 'stock_counts', id: 'stock_counts', name: 'Stock Counts', route: '/stock-counts', path: '/stock-counts', moduleCode: 'inventory', requiredPermission: 'inventory.stock.manage', requiredPermissions: ['inventory.stock.manage'] },
      ],
    })

    // 4. Transfers Module
    this.registerModule({
      code: 'transfers',
      id: 'transfers',
      name: 'Stock Transfers',
      label: 'Stock Transfers',
      description: 'Inter-warehouse and branch stock transfers',
      icon: 'ArrowLeftRight',
      defaultRoute: '/stock-transfers',
      sortOrder: 40,
      permissions: [
        { name: 'inventory.stock_transfers.create', id: 'inventory.stock_transfers.create', label: 'Create Transfer', description: 'Initiate stock transfers', riskLevel: 'MEDIUM' },
        { name: 'inventory.stock_transfers.approve', id: 'inventory.stock_transfers.approve', label: 'Approve Transfer', description: 'Approve or dispatch transfers', riskLevel: 'HIGH' },
      ],
      screens: [
        { code: 'stock_transfers', id: 'stock_transfers', name: 'Transfers', route: '/stock-transfers', path: '/stock-transfers', moduleCode: 'transfers', requiredPermission: 'inventory.stock_transfers.create', requiredPermissions: ['inventory.stock_transfers.create', 'inventory.stock_transfers.approve'] },
      ],
    })

    // 5. Sales Module
    this.registerModule({
      code: 'sales',
      id: 'sales',
      name: 'Sales',
      label: 'Sales',
      description: 'Sales orders, invoices, and shipments',
      icon: 'Receipt',
      defaultRoute: '/sales-orders',
      sortOrder: 50,
      permissions: [
        { name: 'inventory.sales.view', id: 'inventory.sales.view', label: 'View Sales', description: 'View sales orders and shipments', riskLevel: 'LOW' },
        { name: 'inventory.sales.manage', id: 'inventory.sales.manage', label: 'Manage Sales', description: 'Create and fulfil sales orders', riskLevel: 'HIGH' },
      ],
      screens: [
        { code: 'sales_orders', id: 'sales_orders', name: 'Sales Orders', route: '/sales-orders', path: '/sales-orders', moduleCode: 'sales', requiredPermission: 'inventory.sales.view', requiredPermissions: ['inventory.sales.view'] },
        { code: 'sales_invoices', id: 'sales_invoices', name: 'Sales Invoices', route: '/sales-invoices', path: '/sales-invoices', moduleCode: 'sales', requiredPermission: 'inventory.sales.view', requiredPermissions: ['inventory.sales.view'] },
      ],
    })

    // 6. POS Module
    this.registerModule({
      code: 'pos',
      id: 'pos',
      name: 'Point of Sale',
      label: 'Point of Sale',
      description: 'POS cashier terminals, checkouts, and refunds',
      icon: 'Monitor',
      defaultRoute: '/pos',
      sortOrder: 60,
      permissions: [
        { name: 'general.pos.access', id: 'general.pos.access', label: 'Access POS', description: 'Access point of sale screen', riskLevel: 'LOW' },
        { name: 'pos.sale.create', id: 'pos.sale.create', label: 'Ring Up Sales', description: 'Complete sales at POS', riskLevel: 'MEDIUM' },
        { name: 'pos.refund.manage', id: 'pos.refund.manage', label: 'Process Refund', description: 'Approve and execute refunds', riskLevel: 'HIGH' },
      ],
      screens: [
        { code: 'pos', id: 'pos', name: 'POS Register', route: '/pos', path: '/pos', moduleCode: 'pos', requiredPermission: 'general.pos.access', requiredPermissions: ['general.pos.access'] },
      ],
    })

    // 7. Administration Module
    this.registerModule({
      code: 'access_control',
      id: 'access_control',
      name: 'Administration',
      label: 'Administration',
      description: 'Users, roles, permissions, screen registry, and security audit',
      icon: 'Shield',
      defaultRoute: '/users',
      sortOrder: 90,
      permissions: [
        { name: 'access_control.users.view', id: 'access_control.users.view', label: 'View Users', description: 'View tenant users', riskLevel: 'LOW' },
        { name: 'access_control.users.manage', id: 'access_control.users.manage', label: 'Manage Users', description: 'Create, invite, and assign roles to users', riskLevel: 'HIGH' },
        { name: 'access_control.roles.manage', id: 'access_control.roles.manage', label: 'Manage Roles', description: 'Create and configure tenant roles', riskLevel: 'HIGH' },
        { name: 'access_control.permissions.manage', id: 'access_control.permissions.manage', label: 'Manage Permissions', description: 'Map granular permissions to roles', riskLevel: 'CRITICAL' },
        { name: 'access_control.screens.view', id: 'access_control.screens.view', label: 'View Screens', description: 'View registered screens and modules', riskLevel: 'LOW' },
        { name: 'access_control.screens.manage', id: 'access_control.screens.manage', label: 'Manage Screens', description: 'Configure screen access and buttons', riskLevel: 'HIGH' },
        { name: 'access_control.audit.view', id: 'access_control.audit.view', label: 'View Audit Logs', description: 'View security audit trail and tamper verification', riskLevel: 'HIGH', isSensitive: true },
        { name: 'general.settings.manage', id: 'general.settings.manage', label: 'Manage Settings', description: 'Configure tenant settings', riskLevel: 'HIGH' },
      ],
      screens: [
        { code: 'users', id: 'users', name: 'Users', route: '/users', path: '/users', moduleCode: 'access_control', requiredPermission: 'access_control.users.view', requiredPermissions: ['access_control.users.view'] },
        { code: 'roles', id: 'roles', name: 'Roles', route: '/roles', path: '/roles', moduleCode: 'access_control', requiredPermission: 'access_control.roles.manage', requiredPermissions: ['access_control.roles.manage'] },
        { code: 'permissions', id: 'permissions', name: 'Permissions', route: '/permissions', path: '/permissions', moduleCode: 'access_control', requiredPermission: 'access_control.permissions.manage', requiredPermissions: ['access_control.permissions.manage'] },
        { code: 'screens', id: 'screens', name: 'Screen Registry', route: '/access-control/screens', path: '/access-control/screens', moduleCode: 'access_control', requiredPermission: 'access_control.screens.view', requiredPermissions: ['access_control.screens.view'] },
        { code: 'audit', id: 'audit', name: 'Security Audit Trail', route: '/access-control/audit', path: '/access-control/audit', moduleCode: 'access_control', requiredPermission: 'access_control.audit.view', requiredPermissions: ['access_control.audit.view'] },
      ],
    })
  }
}

export const permissionRegistry = PermissionRegistry.getInstance()
