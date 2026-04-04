# Feature Specification: Receive Purchase Order Stock Sync

**Feature Branch**: `009-receive-po-stock-sync`  
**Created**: 2026-04-04
**Status**: Draft  
**Input**: User description: "after reciving purchase order items create record in stock balance (stock_balances) table using the same column names and the same in purchase_orders and purchase_order_items to achive this task and then update product_variants =>  stock_quantity column with the new quantity use supabase inventory project and create database function to achive this task"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Stock Sync on PO Reception (Priority: P1)

As a warehouse operator, I want the system to automatically update my stock levels and record a stock balance entry when I receive items from a purchase order, so that my inventory counts are always accurate without additional manual entries.

**Why this priority**: Core functionality of the feature. Ensuring data consistency between PO records and inventory is essential for business operations.

**Independent Test**: Create a PO, receive items, and verify that both `stock_balances` has new entries and `product_variants` has updated quantities.

**Acceptance Scenarios**:

1. **Given** a purchase order in 'PENDING_RECEIPT' status, **When** the operator marks items as received, **Then** the system MUST create corresponding entries in the `stock_balances` table.
2. **Given** a successful insertion into `stock_balances`, **When** the system completes the transaction, **Then** the `stock_quantity` in the `product_variants` table MUST be incremented by the received amount.

---

### User Story 2 - Atomic Database Update (Priority: P2)

As a system admin, I want all inventory updates caused by a PO reception to occur within a single database transaction, so that partial receipts don't result in inconsistent data if a system error occurs.

**Why this priority**: Essential for data integrity. Inconsistent stock levels can lead to selling items that aren't actually in stock.

**Independent Test**: Simulate a failure during the `stock_balances` insertion and verify that the `product_variants` `stock_quantity` remains unchanged.

**Acceptance Scenarios**:

1. **Given** a database failure during the synchronization process, **When** the transaction is rolled back, **Then** no records MUST remain in `stock_balances` and `product_variants` MUST retain its original quantity.

---

### Edge Cases

- **What happens when a PO item quantity is negative?** (System should validate and prevent recording in stock balances).
- **How does the system handle concurrent PO receipts for the SAME product?** (The database function MUST use appropriate row-level locking or atomic increments).
- **What happens if a PO item is received twice?** (System should prevent duplicate stock balance entries for the same unique PO receipt ID).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a row in the `stock_balances` table for every purchase order item received.
- **FR-002**: The `stock_balances` table columns MUST align with fields found in `purchase_order_items` as specified.
- **FR-003**: System MUST provide a database function (SQL) that handles the logic of recording balance entries and updating product quantities in a single execution.
- **FR-004**: System MUST increment `product_variants.stock_quantity` by the exact quantity received in the PO line item through the database function.
- **FR-005**: System MUST validate that the purchase order exists and is in a state that allows receiving items before performing inventory changes.
- **FR-006**: System MUST trigger the synchronization through a **Manual Application Trigger** (Explicitly called by the backend during the receive action).
- **FR-007**: The `stock_balances` table MUST use an **Exact Schema Clone** of all shared columns between `purchase_order_items` and `stock_balances`.
- **FR-008**: System MUST handle **Batch Partial Receipts**, allowing stock synchronization for subsets of items within a single purchase order.

### Key Entities *(include if feature involves data)*

- **Purchase Order (PO)**: Represents a request for goods from a supplier.
- **Purchase Order Item**: Individual line items specifying products and quantities in a PO.
- **Stock Balance**: Audit log of inventory levels at specific points in time or per warehouse.
- **Product Variant**: Specific version of a product featuring `stock_quantity`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of received PO items results in a corresponding entry in `stock_balances`.
- **SC-002**: Discrepancy between PO received items and total `product_variants` stock updates MUST be 0.
- **SC-003**: The database function MUST execute the full synchronization in under 1.5 seconds even for POs with 100 items.
- **SC-004**: System maintains 100% data integrity through transactional consistency.

## Assumptions

- [Assumption about trigger: The database function will be triggered by an application-level call or a database trigger on the `purchase_orders` or `purchase_order_items` table status update.]
- [Assumption about column mapping: The `stock_balances` table will contain `product_variant_id`, `warehouse_id`, `quantity`, and a reference to the `purchase_order_item_id`.]
- [Assumption about inventory: This feature assumes a multi-warehouse setup where `warehouse_id` is a component of stock management.]
