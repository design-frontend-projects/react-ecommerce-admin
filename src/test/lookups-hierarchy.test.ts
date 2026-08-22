import { describe, it, expect } from 'vitest'
import {
  treeLookupValueNodeSchema,
  lookupTypeTreeNodeSchema,
  lookupTreeResponseSchema,
  lookupValueFormSchema,
  type TreeLookupValueNode,
} from '@/features/lookups/data/schema'

describe('Lookup Hierarchy & Tree Architecture', () => {
  describe('Zod Tree Schemas Validation', () => {
    it('validates a recursive tree node with nested children', () => {
      const rootNode: TreeLookupValueNode = {
        id: 'val-root-1',
        lookup_type_id: 'type-1',
        tenant_id: 'tenant-1',
        code: 'beverages',
        name: 'Beverages',
        name_ar: 'المشروبات',
        description: 'All drink items',
        color: '#3b82f6',
        icon: 'Droplets',
        metadata: { category: 'menu' },
        parent_id: null,
        is_default: false,
        is_system: false,
        is_active: true,
        is_tenant_custom: true,
        sort_order: 1,
        depth: 1,
        type_code: 'product_type',
        type_name: 'Product Type',
        children: [
          {
            id: 'val-child-1',
            lookup_type_id: 'type-1',
            tenant_id: 'tenant-1',
            code: 'cold_drinks',
            name: 'Cold Drinks',
            name_ar: 'مشروبات باردة',
            description: 'Iced drinks and sodas',
            color: '#06b6d4',
            icon: 'Droplets',
            metadata: { temperature: 'cold' },
            parent_id: 'val-root-1',
            is_default: false,
            is_system: false,
            is_active: true,
            is_tenant_custom: true,
            sort_order: 1,
            depth: 2,
            type_code: 'product_type',
            type_name: 'Product Type',
            children: [
              {
                id: 'val-subchild-1',
                lookup_type_id: 'type-1',
                tenant_id: 'tenant-1',
                code: 'soda_cola',
                name: 'Carbonated Soda',
                name_ar: 'مشروبات غازية',
                description: 'Cola and fizzy drinks',
                color: '#ef4444',
                icon: 'Package',
                metadata: { fizzy: true },
                parent_id: 'val-child-1',
                is_default: false,
                is_system: false,
                is_active: true,
                is_tenant_custom: true,
                sort_order: 1,
                depth: 3,
                type_code: 'product_type',
                type_name: 'Product Type',
                children: [],
              },
            ],
          },
        ],
      }

      const result = treeLookupValueNodeSchema.safeParse(rootNode)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.children.length).toBe(1)
        expect(result.data.children[0].children.length).toBe(1)
        expect(result.data.children[0].children[0].code).toBe('soda_cola')
        expect(result.data.children[0].children[0].depth).toBe(3)
      }
    })

    it('validates a complete lookup type tree node with stats and domain tags', () => {
      const typeTreeNode = {
        id: 'type-1',
        code: 'uom_category',
        name: 'Unit of Measure Category',
        description: 'Physical classification groups for Units of Measure',
        is_system: true,
        is_active: true,
        domain: 'inventory',
        domain_label: 'Inventory & Warehousing',
        domain_label_ar: 'المخزون والمستودعات',
        domain_icon: 'Package',
        sort_order: 1,
        values_count: 6,
        active_count: 6,
        custom_count: 0,
        system_count: 6,
        values_tree: [
          {
            id: 'val-1',
            lookup_type_id: 'type-1',
            tenant_id: null,
            code: 'count',
            name: 'Count & Units',
            name_ar: 'العدد والوحدات',
            is_default: true,
            is_system: true,
            is_active: true,
            is_tenant_custom: false,
            sort_order: 1,
            depth: 1,
            type_code: 'uom_category',
            type_name: 'Unit of Measure Category',
            children: [],
          },
        ],
      }

      const result = lookupTypeTreeNodeSchema.safeParse(typeTreeNode)
      expect(result.success).toBe(true)
    })

    it('validates full tree API response schema', () => {
      const fullResponse = {
        success: true,
        data: {
          domains: [
            {
              id: 'inventory',
              label: 'Inventory & Warehousing',
              labelAr: 'المخزون والمستودعات',
              icon: 'Package',
              description: 'Units, warehouses, stock adjustments and location hierarchies',
              typesCount: 1,
              valuesCount: 1,
              types: [
                {
                  id: 'type-1',
                  code: 'uom_category',
                  name: 'Unit of Measure Category',
                  is_system: true,
                  is_active: true,
                  domain: 'inventory',
                  domain_label: 'Inventory & Warehousing',
                  sort_order: 1,
                  values_count: 1,
                  active_count: 1,
                  custom_count: 0,
                  system_count: 1,
                  values_tree: [],
                },
              ],
            },
          ],
          types: [
            {
              id: 'type-1',
              code: 'uom_category',
              name: 'Unit of Measure Category',
              is_system: true,
              is_active: true,
              domain: 'inventory',
              domain_label: 'Inventory & Warehousing',
              sort_order: 1,
              values_count: 1,
              active_count: 1,
              custom_count: 0,
              system_count: 1,
              values_tree: [],
            },
          ],
          stats: {
            total_catalogs: 1,
            total_values: 1,
            total_active_values: 1,
            total_custom_values: 0,
            total_system_values: 1,
            max_hierarchy_depth: 1,
          },
        },
      }

      const result = lookupTreeResponseSchema.safeParse(fullResponse)
      expect(result.success).toBe(true)
    })

    it('validates lookup value form with parentId and custom metadata JSON', () => {
      const formPayload = {
        code: 'sub_damage_water',
        name: 'Water Leaks & Moisture Damage',
        nameAr: 'تلف ناتج عن تسرب المياه والرطوبة',
        description: 'Inventory damaged due to plumbing failure or roof leak',
        color: '#06b6d4',
        icon: 'Droplets',
        parentId: 'parent-damage-uuid-1234',
        isDefault: false,
        isActive: true,
        sortOrder: 3,
        metadataJson: JSON.stringify({ insurance_claimable: true, dept: 'Storage B' }),
      }

      const result = lookupValueFormSchema.safeParse(formPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.parentId).toBe('parent-damage-uuid-1234')
      }
    })
  })

  describe('Parent-Child Hierarchy Tree Construction Logic', () => {
    it('correctly links children to parent nodes and calculates depths', () => {
      const rawValues = [
        { id: '1', name: 'HQ Warehouse', code: 'hq', metadata: {} },
        { id: '2', name: 'Aisle 1', code: 'a1', metadata: { parent_id: '1' } },
        { id: '3', name: 'Shelf A', code: 's_a', metadata: { parent_id: '2' } },
        { id: '4', name: 'Bin 101', code: 'b_101', metadata: { parent_id: '3' } },
        { id: '5', name: 'Regional Hub', code: 'reg', metadata: {} },
      ]

      interface TestNode {
        id: string
        name: string
        code: string
        parent_id: string | null
        depth: number
        children: TestNode[]
      }

      // Build test hierarchy
      const nodeMap = new Map<string, TestNode>()
      const rootNodes: TestNode[] = []

      for (const item of rawValues) {
        const node: TestNode = {
          id: item.id,
          name: item.name,
          code: item.code,
          parent_id: (item.metadata as { parent_id?: string }).parent_id || null,
          depth: 0,
          children: [],
        }
        nodeMap.set(item.id, node)
      }

      for (const node of nodeMap.values()) {
        if (node.parent_id && nodeMap.has(node.parent_id)) {
          nodeMap.get(node.parent_id)!.children.push(node)
        } else {
          rootNodes.push(node)
        }
      }

      let maxDepth = 1
      function assignDepth(nodes: TestNode[], depth: number) {
        if (depth > maxDepth) maxDepth = depth
        for (const n of nodes) {
          n.depth = depth
          if (n.children.length > 0) {
            assignDepth(n.children, depth + 1)
          }
        }
      }
      assignDepth(rootNodes, 1)

      expect(rootNodes.length).toBe(2) // HQ and Regional
      expect(maxDepth).toBe(4) // HQ (1) -> Aisle 1 (2) -> Shelf A (3) -> Bin 101 (4)

      const hqNode = rootNodes.find((n) => n.code === 'hq')
      expect(hqNode).toBeDefined()
      expect(hqNode.children.length).toBe(1)
      expect(hqNode.children[0].children[0].children[0].code).toBe('b_101')
      expect(hqNode.children[0].children[0].children[0].depth).toBe(4)
    })
  })
})
