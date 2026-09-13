import 'dotenv/config';
import prisma from '../src/lib/prisma';
import type {
  inventory_transaction_category_enum,
  inventory_transaction_direction_enum,
  stock_field_enum,
  stock_operation_enum,
  stock_rule_applies_to_enum,
} from '../src/generated/prisma/enums';

interface TypeRuleSeed {
  stock_field: stock_field_enum;
  operation: stock_operation_enum;
  applies_to: stock_rule_applies_to_enum;
  description?: string;
}

interface TransactionTypeSeed {
  code: string;
  name: string;
  description: string;
  direction: inventory_transaction_direction_enum;
  category: inventory_transaction_category_enum;
  requires_approval: boolean;
  requires_destination: boolean;
  allows_negative_stock: boolean;
  auto_post: boolean;
  sort_order: number;
  rules: TypeRuleSeed[];
}

export const INVENTORY_TRANSACTION_TYPES_SEED: TransactionTypeSeed[] = [
  {
    code: 'PURCHASE_RECEIPT',
    name: 'Purchase Receipt',
    description: 'Goods received from vendor against purchase order or invoice',
    direction: 'inbound',
    category: 'purchase',
    requires_approval: false,
    requires_destination: true,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 1,
    rules: [
      { stock_field: 'ON_HAND', operation: 'ADD', applies_to: 'DESTINATION', description: 'Increases destination on-hand' },
      { stock_field: 'AVAILABLE', operation: 'ADD', applies_to: 'DESTINATION', description: 'Increases destination available' },
    ],
  },
  {
    code: 'PURCHASE_RETURN',
    name: 'Purchase Return',
    description: 'Return defective or rejected goods back to supplier',
    direction: 'outbound',
    category: 'return_',
    requires_approval: true,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 2,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases source on-hand' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases source available' },
    ],
  },
  {
    code: 'SALE_POS',
    name: 'POS Sale',
    description: 'Direct point-of-sale customer checkout and immediate stock deduction',
    direction: 'outbound',
    category: 'sale',
    requires_approval: false,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 3,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases source on-hand' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases source available' },
    ],
  },
  {
    code: 'SALE_ORDER_FULFILLMENT',
    name: 'Sales Order Fulfillment',
    description: 'Dispatch and pick/pack shipping for confirmed pre-reserved sales order',
    direction: 'outbound',
    category: 'sale',
    requires_approval: false,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 4,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases source on-hand' },
      { stock_field: 'RESERVED', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Clears active reservation' },
    ],
  },
  {
    code: 'SALE_RETURN',
    name: 'Customer Sales Return',
    description: 'Customer returns item to store or warehouse after sale/refund',
    direction: 'inbound',
    category: 'return_',
    requires_approval: false,
    requires_destination: true,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 5,
    rules: [
      { stock_field: 'ON_HAND', operation: 'ADD', applies_to: 'DESTINATION', description: 'Restocks destination on-hand' },
      { stock_field: 'AVAILABLE', operation: 'ADD', applies_to: 'DESTINATION', description: 'Restocks destination available' },
    ],
  },
  {
    code: 'TRANSFER_SHIPMENT',
    name: 'Warehouse Transfer Shipment',
    description: 'Dispatched transfer between warehouse/store locations into in-transit state',
    direction: 'internal',
    category: 'transfer',
    requires_approval: true,
    requires_destination: true,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 6,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Removes from source on-hand' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Removes from source available' },
      { stock_field: 'IN_TRANSIT', operation: 'ADD', applies_to: 'DESTINATION', description: 'Increases destination in-transit' },
    ],
  },
  {
    code: 'TRANSFER_RECEIPT',
    name: 'Warehouse Transfer Receipt',
    description: 'Arrival and receipt of in-transit transfer at destination warehouse/store',
    direction: 'internal',
    category: 'transfer',
    requires_approval: false,
    requires_destination: true,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 7,
    rules: [
      { stock_field: 'IN_TRANSIT', operation: 'SUBTRACT', applies_to: 'DESTINATION', description: 'Clears destination in-transit' },
      { stock_field: 'ON_HAND', operation: 'ADD', applies_to: 'DESTINATION', description: 'Increases destination on-hand' },
      { stock_field: 'AVAILABLE', operation: 'ADD', applies_to: 'DESTINATION', description: 'Increases destination available' },
    ],
  },
  {
    code: 'STOCK_RESERVATION',
    name: 'Stock Reservation',
    description: 'Locks available stock for pending order without physical movement',
    direction: 'internal',
    category: 'reservation',
    requires_approval: false,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 8,
    rules: [
      { stock_field: 'RESERVED', operation: 'ADD', applies_to: 'SOURCE', description: 'Increases reserved quantity' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases available quantity' },
    ],
  },
  {
    code: 'STOCK_UNRESERVATION',
    name: 'Stock Un-reservation',
    description: 'Releases reserved stock back to available pool upon cancellation/expiry',
    direction: 'internal',
    category: 'reservation',
    requires_approval: false,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 9,
    rules: [
      { stock_field: 'RESERVED', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases reserved quantity' },
      { stock_field: 'AVAILABLE', operation: 'ADD', applies_to: 'SOURCE', description: 'Restores available quantity' },
    ],
  },
  {
    code: 'ADJUSTMENT_IN',
    name: 'Stock Adjustment (Increase)',
    description: 'Manual or stock-count upward correction',
    direction: 'inbound',
    category: 'adjustment',
    requires_approval: true,
    requires_destination: true,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 10,
    rules: [
      { stock_field: 'ON_HAND', operation: 'ADD', applies_to: 'DESTINATION', description: 'Increases destination on-hand' },
      { stock_field: 'AVAILABLE', operation: 'ADD', applies_to: 'DESTINATION', description: 'Increases destination available' },
    ],
  },
  {
    code: 'ADJUSTMENT_OUT',
    name: 'Stock Adjustment (Decrease)',
    description: 'Manual or stock-count downward correction',
    direction: 'outbound',
    category: 'adjustment',
    requires_approval: true,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 11,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases source on-hand' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Decreases source available' },
    ],
  },
  {
    code: 'DAMAGE_WRITE_OFF',
    name: 'Damaged Stock Write-off',
    description: 'Removes damaged inventory from active saleable balance and flags as damaged',
    direction: 'outbound',
    category: 'adjustment',
    requires_approval: true,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 12,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Deducts from source on-hand' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Deducts from source available' },
      { stock_field: 'DAMAGED', operation: 'ADD', applies_to: 'SOURCE', description: 'Records under damaged balance' },
    ],
  },
  {
    code: 'EXPIRY_SCRAP',
    name: 'Expired Stock Scrap',
    description: 'Scraps expired batch/lot items from inventory',
    direction: 'outbound',
    category: 'adjustment',
    requires_approval: true,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: false,
    sort_order: 13,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Deducts from source on-hand' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Deducts from source available' },
    ],
  },
  {
    code: 'MARKETPLACE_ORDER',
    name: 'Marketplace Order Dispatch',
    description: 'Dispatches fulfillment for marketplace channels (e.g. Amazon, Salla, Zid)',
    direction: 'outbound',
    category: 'sale',
    requires_approval: false,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 14,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Deducts on-hand stock' },
      { stock_field: 'RESERVED', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Clears marketplace reservation' },
    ],
  },
  {
    code: 'PRODUCTION_CONSUMPTION',
    name: 'Production Raw Material Consumption',
    description: 'Deducts raw materials / ingredients used in kitchen recipes or bill of materials',
    direction: 'outbound',
    category: 'production',
    requires_approval: false,
    requires_destination: false,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 15,
    rules: [
      { stock_field: 'ON_HAND', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Deducts raw materials on-hand' },
      { stock_field: 'AVAILABLE', operation: 'SUBTRACT', applies_to: 'SOURCE', description: 'Deducts raw materials available' },
    ],
  },
  {
    code: 'PRODUCTION_OUTPUT',
    name: 'Production Finished Good Output',
    description: 'Adds finished prepared dish or assembled product batch to available stock',
    direction: 'inbound',
    category: 'production',
    requires_approval: false,
    requires_destination: true,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 16,
    rules: [
      { stock_field: 'ON_HAND', operation: 'ADD', applies_to: 'DESTINATION', description: 'Adds finished good on-hand' },
      { stock_field: 'AVAILABLE', operation: 'ADD', applies_to: 'DESTINATION', description: 'Adds finished good available' },
    ],
  },
  {
    code: 'OPENING_BALANCE',
    name: 'Opening Stock Balance Initialization',
    description: 'Initial stock migration or inventory baseline initialization',
    direction: 'inbound',
    category: 'opening',
    requires_approval: true,
    requires_destination: true,
    allows_negative_stock: false,
    auto_post: true,
    sort_order: 17,
    rules: [
      { stock_field: 'ON_HAND', operation: 'ADD', applies_to: 'DESTINATION', description: 'Initializes on-hand stock' },
      { stock_field: 'AVAILABLE', operation: 'ADD', applies_to: 'DESTINATION', description: 'Initializes available stock' },
    ],
  },
];

export async function seedInventoryTransactionTypes() {
  console.log('--- Seeding Inventory Transaction Types & Rules ---');

  for (const item of INVENTORY_TRANSACTION_TYPES_SEED) {
    const { rules, ...typeData } = item;

    const existingType = await prisma.inventory_transaction_types.findFirst({
      where: { code: typeData.code },
    });

    let typeId: string;

    if (!existingType) {
      const created = await prisma.inventory_transaction_types.create({
        data: {
          code: typeData.code,
          name: typeData.name,
          description: typeData.description,
          direction: typeData.direction,
          category: typeData.category,
          requires_approval: typeData.requires_approval,
          requires_destination: typeData.requires_destination,
          allows_negative_stock: typeData.allows_negative_stock,
          auto_post: typeData.auto_post,
          sort_order: typeData.sort_order,
          is_system: true,
          is_active: true,
        },
      });
      typeId = created.id;
      console.log(`[+] Created type: ${typeData.code} (${created.id})`);
    } else {
      typeId = existingType.id;
      console.log(`[=] Type exists: ${typeData.code}`);
    }

    // Seed rules
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const existingRule = await prisma.inventory_transaction_type_rules.findFirst({
        where: {
          transaction_type_id: typeId,
          stock_field: rule.stock_field,
          applies_to: rule.applies_to,
        },
      });

      if (!existingRule) {
        await prisma.inventory_transaction_type_rules.create({
          data: {
            transaction_type_id: typeId,
            stock_field: rule.stock_field,
            operation: rule.operation,
            applies_to: rule.applies_to,
            description: rule.description,
            sort_order: i + 1,
          },
        });
        console.log(`    [+] Added rule: ${rule.stock_field} -> ${rule.operation} (${rule.applies_to})`);
      }
    }
  }

  console.log('--- Completed Seeding Inventory Transaction Types ---');
}

if (process.argv[1]?.endsWith('seed-inventory-transaction-types.ts')) {
  seedInventoryTransactionTypes()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
