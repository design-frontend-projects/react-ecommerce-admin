# Feature Specification: Stock Adjustments

**Feature Branch**: `023-stock-adjustments`  
**Created**: 2026-07-07  
**Status**: Draft  
**Input**: User description: "build moule for Stock Adjustments Allow manual stock entry, adjustments for damaged goods, and inventory counts"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manual Stock Entry (Priority: P1)

As a store manager, I want to perform quick manual stock adjustments (increases or decreases) for individual product variants, so that I can correct simple inventory errors immediately.

**Why this priority**: Immediate need to correct stock counting errors, receipts, or data entry errors to ensure POS and online storefront show correct stock quantities.

**Independent Test**: Can select a product variant in a store, input a positive or negative quantity adjustment, and verify that the stock balance updates correctly in the database and is logged.

**Acceptance Scenarios**:

1. **Given** a store manager is on the Stock Adjustments dashboard, **When** they select a product variant, enter a quantity adjustment (+10 or -5), choose a reason (e.g., "Data Entry Error"), and submit, **Then** the store's stock balance for that variant is updated by the exact quantity and a stock movement record is logged.
2. **Given** a store manager attempts to enter a manual adjustment, **When** the resulting quantity would cause stock on hand to fall below zero, **Then** the system blocks the adjustment and displays a warning message.

---

### User Story 2 - Damaged Goods Adjustment (Priority: P2)

As a store clerk or manager, I want to record inventory reductions specifically due to damaged, expired, or stolen items, so that I can maintain accurate stock counts and calculate cost losses.

**Why this priority**: Important for tracking shrinkage, managing food safety (expiration), and accounting for losses due to damaged goods.

**Independent Test**: Can select a product variant, select a shrinkage reason (Damaged, Expired, Stolen), enter the quantity to write off, and verify that stock is reduced and a cost loss is recorded based on the variant's average cost.

**Acceptance Scenarios**:

1. **Given** a store user is recording damaged goods, **When** they select a product variant, choose "Damaged" as the reason, enter a quantity of 3, and save, **Then** the system reduces stock by 3, logs an inventory movement of type `damage`, and records the cost loss.
2. **Given** a store user is recording expired goods, **When** they select a product variant, choose "Expired" as the reason, enter a quantity of 5, and save, **Then** the system reduces stock by 5, logs an inventory movement of type `expired`, and records the cost loss.

---

### User Story 3 - Inventory Counts / Stocktaking (Priority: P1)

As a store auditor or manager, I want to perform a periodic inventory count (stocktaking) where I count physical stock and the system automatically reconciles any differences against recorded stock.

**Why this priority**: Required for compliance, auditing, and bulk stock corrections. Without this, users have to manually adjust every single discrepancy one by one.

**Independent Test**: Can start an inventory count session for a store, enter physical count values for multiple products, preview discrepancy calculations, and approve the reconciliation to update all stock balances.

**Acceptance Scenarios**:

1. **Given** a store manager starts a new inventory count session for a store, **When** they select a category or search for products and input physical quantities, **Then** the system displays the discrepancy (Physical Count - System Count) for each line item.
2. **Given** a manager has completed counting and clicks "Reconcile Count", **When** they approve the session, **Then** the system automatically generates corresponding inventory movements for the discrepancies and updates the stock balances.

---

### Edge Cases

- **Product Sales During Active Stocktake**: What happens if a POS sale or stock movement occurs for an item after the stocktake session starts but before it is finalized?
  - *Resolution*: The system records the "system quantity" at the moment the stocktake is created. Discrepancies are calculated against this snapshot. When finalizing, the system will apply the discrepancy delta (Physical Count - Captured System Quantity) to the current live stock balance rather than overwriting it, or raise a warning if the live stock changed.
- **Negative Adjustments Exceeding Current Stock**: What happens if an adjustment would result in a negative stock balance?
  - *Resolution*: The system prevents adjustments that result in negative stock balances, unless negative stock is explicitly permitted in the store settings.
- **Unfinished Count Sessions**: What happens if a stocktake session is left open or abandoned?
  - *Resolution*: Count sessions can be saved as "Draft". Draft sessions do not affect stock balances. Users can resume or discard draft sessions. Only approved sessions update inventory.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized users to create a stock adjustment transaction containing one or more product variants.
- **FR-002**: The system MUST support the following adjustment types: Manual Entry, Damaged/Expired Goods, and Inventory Counts.
- **FR-003**: The system MUST allow authorized users (Managers/Admins) to apply adjustments immediately to update inventory balances without a pending approval stage.
- **FR-004**: The system MUST automatically update the corresponding `qty_on_hand` and `qty_available` in `stock_balances` when a stock adjustment is approved/submitted.
- **FR-005**: During active inventory count sessions, system stock changes MUST NOT be frozen; instead, the system MUST reconcile based on the discrepancy delta between the physical count and the system snapshot captured at the start of the count.
- **FR-006**: When recording damaged goods, the cost loss MUST be calculated strictly using the current Average Cost (avg_cost) from the database without allowing user override.
- **FR-007**: The system MUST log an `inventory_movements` record for each adjusted product variant, with `movement_type` set to `adjustment_in`, `adjustment_out`, `damage`, or `expired` as appropriate, capturing the user, timestamp, quantity change, and remarks.
- **FR-008**: Any database schema changes MUST define `stock_adjustments` and `stock_adjustment_items` tables with proper relations and Zod validation schemas.

### Key Entities *(include if feature involves data)*

- **StockAdjustment**: Represents a batch adjustment session.
  - `id`: UUID (Primary Key)
  - `tenant_id`: UUID (Foreign Key)
  - `store_id`: UUID (Foreign Key)
  - `status`: String/Enum (draft, pending, approved, cancelled)
  - `type`: String/Enum (manual, damage, stocktake)
  - `notes`: Text (Optional)
  - `created_by`: UUID (Foreign Key)
  - `approved_by`: UUID (Foreign Key, Optional)
  - `created_at`: DateTime
  - `updated_at`: DateTime
- **StockAdjustmentItem**: Represents a line item in a stock adjustment batch.
  - `id`: UUID (Primary Key)
  - `stock_adjustment_id`: UUID (Foreign Key)
  - `product_variant_id`: UUID (Foreign Key)
  - `qty_before`: Decimal (Recorded system qty at time of adjustment/count)
  - `qty_after`: Decimal (Physical count or final adjusted qty)
  - `qty_adjusted`: Decimal (Delta adjustment amount)
  - `unit_cost`: Decimal (Cost of item at time of adjustment)
  - `reason`: String (e.g., "damage", "expired", "theft", "data_entry_error", "stocktake_discrepancy")

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of stock adjustments automatically trigger corresponding `inventory_movements` logs and update `stock_balances` in a single database transaction.
- **SC-002**: The stock adjustments dashboard lists all previous adjustments with details including the creator, reason, store, and total cost impact.
- **SC-003**: The system calculates stocktaking discrepancies accurately (Physical - System) and lists them clearly in the reconciliation UI.
- **SC-004**: Bulk stock count imports or listings of up to 500 items are parsed, saved as draft, and validated within 3 seconds.

## Assumptions

- **A-001**: All stock adjustments are scoped to a specific store and tenant. Cross-store adjustments are handled as stock transfers, not stock adjustments.
- **A-002**: Average cost (`avg_cost` in `stock_balances`) will be used as the default unit cost for calculating financial loss on damaged/expired goods.
- **A-003**: Users must have the required role/permissions to create or approve stock adjustments.
