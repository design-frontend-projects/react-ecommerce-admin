# Feature Specification: Enhance Product and Variants Definition

**Feature Branch**: `005-enhance-product-variants`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "enhance product definition and variants based on prisma/schema.prisma with 2 steps"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Base Product (Priority: P1)

As a store manager, I want to define the general information for a new product (name, category, description) before specifying its specific options, so that I can establish a catalog entry efficiently.

**Why this priority**: Essential for any inventory management; products must exist before variants can be added.

**Independent Test**: Can be fully tested by creating a product entry and verifying it appears in the catalog without variants yet.

**Acceptance Scenarios**:

1. **Given** the product creation page, **When** I fill in Name, Category, and SKU then click "Next", **Then** the product is saved and I am moved to the variant definition step.
2. **Given** valid base info, **When** I save it, **Then** a new record is created in the `products` table with `has_variants` potentially set to true.

---

### User Story 2 - Define Multi-Variant Specifications (Priority: P1)

As a store manager, I want to add multiple variants (e.g., Different Sizes or Colors) to a product, each with its own price and stock level, so that customers can choose precisely what they want.

**Why this priority**: Core requirement for the "2 steps" process and "Multiple variants per product" logic.

**Independent Test**: Can be tested by adding 2+ variants to an existing product and verifying each has its own unique SKU and price in the database.

**Acceptance Scenarios**:

1. **Given** a recently created product, **When** I add a variant with "Size: Small, Price: $10, Stock: 50", **Then** a new record is created in `product_variants`.
2. **Given** multiple variants added, **When** I finish the process, **Then** all variants are correctly linked to the parent product.

---

### User Story 3 - Variant-Level Inventory Tracking (Priority: P2)

As an inventory clerk, I want to track stock levels for each specific variant separately, so that I don't run out of a particular size or color even if other variants are in stock.

**Why this priority**: Critical for business operations and accurate stock reporting.

**Independent Test**: Update stock for one variant and verify that other variants of the same product remain unchanged.

**Acceptance Scenarios**:

1. **Given** a product with 'Red' and 'Blue' variants, **When** 'Red' stock is decreased, **Then** only the 'Red' variant's `stock_quantity` is updated in `product_variants`.

---

### Edge Cases

- **What happens when a product has no variants?** System should allow a "Single Variant" mode or default to one variant that matches the product's base info.
- **How does the system handle duplicate SKUs across variants?** The system MUST reject variant creation if the SKU already exists in the `product_variants` table (due to unique constraint).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement a two-step wizard: Step 1 for Base Product Info and Step 2 for Variant Setup.
- **FR-002**: Product base information MUST include Name and uniquely identifiable SKU or Barcode if variants aren't specified yet.
- **FR-003**: The variant definition step MUST support adding multiple rows, each representing a unique variant.
- **FR-004**: Each variant MUST have its own `price`, `cost_price`, `stock_quantity`, and `min_stock` fields.
- **FR-005**: The system MUST persist data in the `products` and `product_variants` tables according to the Prisma schema relationship (1:N).
- **FR-006**: System MUST allow editing of variants after the initial 2-step creation process.

### Key Entities

- **Product**: Represents the high-level item in the catalog. Attributes: `product_id`, `name`, `category_id`, `description`, `has_variants`.
- **ProductVariant**: Represents a specific SKU-able version of the product. Attributes: `id`, `product_id`, `sku`, `price`, `stock_quantity`, `is_active`. Linked to `Product` via `product_id`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of product creations follow the 2-step flow successfully.
- **SC-002**: Data integrity is maintained with every variant having a valid `product_id` reference.
- **SC-003**: Users can add up to 20 variants to a single product within under 2 minutes.

## Assumptions

- **Existing categories**: Products will be linked to categories that already exist in the `categories` table.
- **SKU uniqueness**: SKUs are unique across all variants and products in the system.
- **Unit of Measure**: All products and variants use the same unit system (e.g., units, kg) unless specified in `weight`.
- **Clerk User Context**: All creations will be associated with a valid `clerk_user_id` from the active session.
