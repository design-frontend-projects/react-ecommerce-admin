# Specification: Transactions Module (Multi-Tenant POS/E-commerce)

## 1. Overview
A production-ready transactions module designed for a multi-tenant SaaS environment. It tracks sales, purchases, and returns, ensuring strict tenant isolation and user-level auditing.

## 2. Functional Requirements

### 2.1 Database Schema (Prisma)
- **Transactions (Header):**
  - **Core:** `id` (UUID), `tenant_id` (UUID), `clerk_user_id` (Text), `transaction_number` (String), `transaction_type` (Enum: sale, purchase, return, adjustment).
  - **Financials:** `status` (Enum: pending, paid, cancelled, refunded, completed), `currency` (String), `subtotal`, `tax_amount`, `discount_amount`, `total_amount` (Decimal).
  - **Metadata & Audit:** `ip_address` (String), `user_agent` (String), `metadata` (JSONB), `notes` (Text), `created_at`, `updated_at`.
- **Transaction Details (Items):**
  - **Core:** `id` (UUID), `tenant_id` (UUID), `transaction_id` (UUID), `product_id` (UUID), `quantity` (Decimal), `unit_price` (Decimal).
  - **Line Financials:** `discount_amount`, `tax_amount`, `subtotal` (Decimal).
  - **Constraints:** Quantity and unit price MUST be > 0. `subtotal` MUST equal `(qty * price) - discount + tax`.

### 2.2 Security & Multi-Tenancy
- **Tenant Isolation:** Every record in `transactions` and `transaction_details` MUST contain a `tenant_id`.
- **Clerk Integration:** Every transaction MUST reference a `clerk_user_id` from the authentication system.
- **Auditing:** Tracking of the source IP and user agent for all transactions.

### 2.3 Business Logic & Validation
- **Real-time Stock Check:** Inventory levels MUST be validated before committing a transaction to prevent overselling.
- **Atomic Updates:** Calculations (subtotals/totals) MUST be verified server-side before persisting to the database.

## 3. Non-Functional Requirements
- **Performance:** Optimized indexes on `tenant_id`, `clerk_user_id`, and `product_id`.
- **Scalability:** Use of UUIDs and composite indexes for efficient querying in a multi-tenant environment.
- **Integrity:** Database-level foreign keys with `ON DELETE CASCADE` for tenant data cleanup.

## 4. Acceptance Criteria
- [ ] `prisma migrate` successfully creates `transactions` and `transaction_details` tables.
- [ ] A transaction cannot be created without a valid `tenant_id` and `clerk_user_id`.
- [ ] Line item subtotals are correctly validated against the provided quantity and unit price.
- [ ] The system prevents transactions for products with insufficient inventory levels.
- [ ] Metadata (JSONB) correctly stores and retrieves flexible transaction context.

## 5. Out of Scope
- Payment processing gateway integrations (e.g., Stripe, PayPal).
- Advanced inventory movement logs (basic stock check only).
- Multi-currency conversion logic (basic currency string storage only).
