# Feature Specification: Marketplace Inventory & Auto-Reordering

**Feature Branch**: `022-inventory-marketplace-reorder`  
**Created**: 2026-07-06  
**Status**: Draft  
**Input**: User description: "Enable tenants to manage product inventory with marketplace integration, supplier preferences, and automated reordering."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark Products and Inventory as Marketplace Products (Priority: P1)

As a tenant store manager, I want to flag specific products and their inventory items as marketplace products, so that they are distinguished from regular store products and made available for marketplace transactions.

**Why this priority**: This is the foundation of the feature. Without distinguishing marketplace products in the data layer, marketplace integrations and separate inventory tracking cannot function.

**Independent Test**: Can create a product, set its `is_marketplace` flag to true, verify it propagates to its corresponding inventory records, and check that only marketplace-flagged products are returned when querying for marketplace inventory.

**Acceptance Scenarios**:

1. **Given** a tenant admin is on the Product Creation/Edit page, **When** they toggle the "Marketplace Product" option to enabled and save, **Then** the product's `is_marketplace` field is set to `true` in the database.
2. **Given** a product is marked as a "Marketplace Product", **When** its inventory record is created or updated, **Then** the inventory record's `is_marketplace` field must automatically align with the product's flag.
3. **Given** a product is not marked as a "Marketplace Product", **When** checking the marketplace inventory, **Then** it must not appear in any marketplace-specific product feeds or views.

---

### User Story 2 - Configure Preferred Suppliers (Priority: P2)

As a tenant administrator, I want to select and mark specific suppliers as "Preferred Suppliers" in my settings, so that the system knows which suppliers I trust and prioritize for inventory replenishment.

**Why this priority**: Necessary precursor for automatic reordering. The system needs to know which suppliers are preferred before it can automate purchase orders.

**Independent Test**: Retrieve the list of suppliers, toggle "Preferred Status" on a supplier, save, and verify that the supplier's `is_preferred` flag is updated in the database and displayed correctly in the settings UI.

**Acceptance Scenarios**:

1. **Given** a tenant admin is viewing the Supplier Settings page, **When** they select a supplier and check the "Preferred Supplier" box, **Then** the supplier record is saved with `is_preferred` set to `true`.
2. **Given** a supplier is marked as preferred, **When** viewing the list of suppliers, **Then** preferred suppliers are highlighted or filtered to the top of the list.

---

### User Story 3 - Automatic Inventory Reordering (Priority: P3)

As a tenant store manager, I want the system to automatically generate pending purchase orders with preferred suppliers when product stock falls below the minimum threshold, provided the global "Auto Reorder" setting is enabled.

**Why this priority**: Completes the automated inventory replenishment workflow, reducing manual intervention and avoiding stockouts.

**Independent Test**: Enable the global "Auto Reorder" setting, decrease product stock below its reorder level where the product's supplier is marked as preferred, trigger the inventory check, and verify a pending purchase order is automatically created for that supplier.

**Acceptance Scenarios**:

1. **Given** the global "Auto Reorder" flag is disabled, **When** product stock falls below its `reorder_level` for a product with a preferred supplier, **Then** no automatic purchase order is created.
2. **Given** the global "Auto Reorder" flag is enabled, **When** product stock falls below its `reorder_level` and the associated supplier is marked as `is_preferred`, **Then** the system automatically generates a `purchase_orders` record with `status: "pending"` containing the low-stock items.
3. **Given** the global "Auto Reorder" flag is enabled, **When** product stock falls below its `reorder_level` but the associated supplier is NOT marked as preferred, **Then** no automatic purchase order is generated, and a low-stock notification is logged instead.

---

### Edge Cases

- **Multiple Low-Stock Products from the Same Preferred Supplier**: If multiple products from the same preferred supplier fall below their reorder levels around the same time, how does the system group them?
  - *Resolution*: The system should consolidate all low-stock products from the same supplier into a single pending purchase order within a daily run window to avoid duplicate order generation.
- **Auto Reorder Trigger Loop**: What prevents the system from repeatedly generating auto-orders for the same low-stock product if an order is already pending?
  - *Resolution*: The auto-reorder job must ignore products that are already included in an open/pending purchase order.
- **Supplier has No Email or Contact Info**: When auto-reordering is triggered, but the preferred supplier record has missing contact details (e.g. email or phone).
  - *Resolution*: The purchase order is created in a "Draft" status, and a system alert/notification is generated for the store administrator to review and complete the supplier details.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support an `is_marketplace` Boolean flag on both `products` and `inventory` models, defaulting to `false`.
- **FR-002**: The system MUST validate that a marketplace product has a valid associated inventory record.
- **FR-003**: The system MUST allow tenants to toggle the `is_preferred` Boolean flag (defaulting to `false`) on the `suppliers` model.
- **FR-004**: The system MUST support a tenant-level configuration flag `auto_reorder` (Boolean, default `false`) within tenant settings.
- **FR-005**: When `auto_reorder` is enabled, the system MUST monitor inventory levels and automatically generate a pending purchase order for any product whose quantity falls below its `reorder_level`, provided its associated supplier is marked as preferred.
- **FR-006**: The system MUST prevent duplicate pending purchase orders for the same product-supplier combination if one is already open.
- **FR-007**: Any database schema changes MUST include appropriate Zod validation schemas for forms and API routes.

### Key Entities *(include if feature involves data)*

- **Product**: Represents a catalog item. Now includes `is_marketplace` (Boolean) to flag availability for marketplace transactions.
- **Inventory**: Represents the stock level and location details of a product. Now includes `is_marketplace` (Boolean) to align with product type.
- **Supplier**: Represents an external vendor. Now includes `is_preferred` (Boolean) to designate preferred status.
- **Tenant settings / rbac_tenants**: Represents the tenant account configuration. Now includes `auto_reorder` (Boolean) to control the automated reordering feature globally for the tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of products flagged as marketplace products are successfully filtered and queried separately from standard store inventory.
- **SC-002**: When the "Auto Reorder" flag is enabled, the system initiates purchase order creation within 15 minutes of stock dropping below the reorder level for products with preferred suppliers.
- **SC-003**: Zero duplicate pending purchase orders are created for any single supplier-product combination during automated replenishment cycles.
- **SC-004**: 100% of auto-generated purchase orders are correctly linked to the correct preferred supplier in the database.

## Assumptions

- **A-001**: A product is associated with a single supplier via the `supplier_id` foreign key. If a product needs multiple suppliers, it is handled outside the scope of the auto-reorder P1-P3 flows.
- **A-002**: The automatic reorder check will run on a cron schedule (e.g., hourly or daily) or via database triggers on inventory movements.
- **A-003**: The user authentication ID (`auth_user_id` or `tenant_id`) will be used to scope all queries, ensuring tenants can only see and configure their own preferred suppliers and settings.
