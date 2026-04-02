# Feature Specification: Stock Balances Module & Inventory Automation

**Feature Branch**: `006-stock-balances-automation`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "create stock_balances module with screens based on schema.prisma model stock_balances and allow admin to define the balance also when recive order from purchase order create procedure in supabase inventory project to increase the product quantity based on the recived quantity also when make refund increase the quantity"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-time Stock Visibility (Priority: P1)

As an inventory manager, I want to see a comprehensive list of all product variants and their current stock levels across different stores, so I can make informed decisions about restocking.

**Why this priority**: Core value of the module; without visibility, management is impossible.

**Independent Test**: Can be tested by navigating to the Stock Balances screen and verifying that the data matches the `stock_balances` table records.

**Acceptance Scenarios**:

1. **Given** there are existing entries in the `stock_balances` table, **When** I open the Stock Balances page, **Then** I should see a table listing products, variants, store names, and current quantities on hand.
2. **Given** the list of stock balances, **When** I filter by store or product, **Then** the list should update to show only relevant matches.

---

### User Story 2 - Manual Stock Adjustment (Priority: P2)

As an admin, I want to manually adjust or "define" the stock balance for a specific variant in a specific store (e.g., after a physical audit), so that the system records accurately reflect reality.

**Why this priority**: Essential for handling discrepancies and initial setup.

**Independent Test**: Can be tested by adjusting a stock level via the UI and verifying both the `stock_balances` record and a new entry in `inventory_movements`.

**Acceptance Scenarios**:

1. **Given** I am on the Stock Balances page, **When** I select an adjustment action for a variant, **Then** I should be able to enter a new quantity or an offset.
2. **Given** a valid adjustment is saved, **When** the system processes it, **Then** the `qty_on_hand` must update and a record of type "adjustment" must appear in `inventory_movements`.

---

### User Story 3 - Automated PO Receipt (Priority: P1)

As a warehouse worker, I want the system to automatically update stock levels when a purchase order is marked as received, so that I don't have to manually increment inventory for every item.

**Why this priority**: Critical automation for operational efficiency.

**Independent Test**: Can be tested by changing a PO status to "received" in Supabase and checking if the corresponding `stock_balances` increment correctly.

**Acceptance Scenarios**:

1. **Given** a Purchase Order with status "pending", **When** its status is changed to "received", **Then** the system must calculate the received quantities and add them to the respective `stock_balances`.
2. **Given** a PO receipt update, **When** the stock is increased, **Then** an `inventory_movements` record of type "purchase" must be created for each item.

---

### User Story 4 - Automated Refund Restocking (Priority: P2)

As a store admin, I want product quantities to automatically increase when a refund is processed (assuming the item is returned to stock), so inventory remains accurate after returns.

**Why this priority**: Prevents stock leakage from returns not being added back.

**Independent Test**: Can be tested by processing a refund and verifying the quantity increase in the inventory module.

**Acceptance Scenarios**:

1. **Given** a successful refund is recorded in the system, **When** the refund status becomes "processed", **Then** the associated product quantities should increase.

---

### Edge Cases

- **Negative Balances**: What happens if an adjustment tries to set a balance below zero? (System should allow it if "allow negative stock" is enabled, otherwise error).
- **Missing Stock Record**: What if a PO receipt occurs for a variant that doesn't yet have a record in `stock_balances`? (System MUST create the initial record).
- **Concurrent Updates**: How does the system handle multiple updates (e.g., PO receipt and manual adjustment) at the same time? (Row-level locking in Supabase procedure).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a paginated list of all `stock_balances` with sorting and filtering by Store, Product, and Category.
- **FR-002**: Admins MUST be able to perform "Stock Adjustments" (manual override) which updates the `qty_on_hand` directly.
- **FR-003**: System MUST automatically create a procedure/trigger in Supabase that listens for `purchase_orders` status changes. 
- **FR-004**: When a `purchase_orders` record status becomes 'received', the system MUST iterate through `purchase_order_items` and increment the `qty_on_hand` in `stock_balances` for the target store. [NEEDS CLARIFICATION: How to determine target store if PO doesn't have one?]
- **FR-005**: When a `refunds` record is created or updated to a "processed" status, the system MUST increment the quantity in `stock_balances`. [NEEDS CLARIFICATION: Does every refund imply a physical return to stock?]
- **FR-006**: Every change to `stock_balances` (manual or automatic) MUST generate a corresponding audit record in `inventory_movements`.

### Key Entities *(include if feature involves data)*

- **Stock Balance**: Represents the current snapshot of physical inventory for a SKU in a specific location.
- **Inventory Movement**: A ledger entry recording the "Why", "When", and "By Whom" for every quantity change (In/Out).
- **Purchase Order**: The source document for inventory fulfillment from suppliers.
- **Refund**: The document recording financial/inventory reversal for sales.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Inventory levels are updated within 500ms of a PO being marked "received".
- **SC-002**: Manual audits take 30% less time due to direct adjustment screens.
- **SC-003**: 100% of inventory changes can be traced back to a source document or adjustment reason in `inventory_movements`.

## Assumptions

- **Store Mapping**: We assume that if a PO lacks a `store_id`, it is received into the "Main Warehouse" or the user's primary assigned store (to be clarified).
- **Unit of Measure**: We assume all quantities are in the same base unit defined on the product variant.
- **Refund Logic**: We assume refunds only increase stock if the UI workflow indicates the items were physically returned (to be clarified).
- **Tenant Scope**: All operations are scoped to the `tenant_id` associated with the active session.
