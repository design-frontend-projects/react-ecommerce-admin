# Data Model - Marketplace Inventory & Auto-Reordering Database Changes

This document outlines the modifications made to the database schema models and validations for the Marketplace Inventory & Auto-Reordering feature.

## Database Entities

### 1. `products` (Modified)
Represents a catalog product.
- **New Field**: `is_marketplace`
  - **Type**: `Boolean`
  - **Constraints**: `default(false)`
  - **Description**: Marks the product as available for marketplace transactions.
- **Validation**:
  - Zod: `is_marketplace: z.boolean().default(false)`

### 2. `inventory` (Modified)
Represents stock records for a product.
- **New Field**: `is_marketplace`
  - **Type**: `Boolean`
  - **Constraints**: `default(false)`
  - **Description**: Distinguishes marketplace inventory logs and levels from standard store inventory.
- **Validation**:
  - Zod: `is_marketplace: z.boolean().default(false)`

### 3. `suppliers` (Modified)
Represents product vendors.
- **New Field**: `is_preferred`
  - **Type**: `Boolean`
  - **Constraints**: `default(false)`
  - **Description**: Dictates whether the supplier is prioritized for automatic inventory reordering.
- **Validation**:
  - Zod: `is_preferred: z.boolean()`

### 4. `rbac_tenants` (Modified)
Represents a tenant account.
- **New Field**: `auto_reorder`
  - **Type**: `Boolean`
  - **Constraints**: `default(false)`
  - **Description**: Global config flag to enable/disable automated reordering.
- **Validation**:
  - Zod: `auto_reorder: z.boolean().default(false)`

## Relationships
- A product has 0 or 1 inventory record (1-to-1).
- A product is optionally linked to one supplier (via `supplier_id`).
- When a product's stock is low, and its associated supplier has `is_preferred = true`, the system initiates automated purchase orders if the tenant has `auto_reorder = true`.
