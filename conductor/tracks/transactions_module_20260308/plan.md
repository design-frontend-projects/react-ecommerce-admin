# Implementation Plan: Transactions Module

This plan outlines the multi-phase implementation of the multi-tenant Transactions and Transaction Details tables, ensuring high data integrity and strict tenant isolation.

## Phase 1: Database Schema & Migration
This phase focuses on defining the Prisma models and applying the database schema changes.

- [ ] Task: Define the `Transaction` and `TransactionDetails` models in `prisma/schema.prisma` according to the specification.
- [ ] Task: Add necessary database-level indexes for `tenant_id`, `clerk_user_id`, and `product_id`.
- [ ] Task: Run `pnpm prisma migrate dev` to create the new tables and update the Prisma client.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database Schema & Migration' (Protocol in workflow.md)

## Phase 2: Core Validation & Calculation Logic
This phase implements the server-side logic for validating line item calculations and ensuring data integrity.

- [ ] Task: Write unit tests for transaction calculation logic (subtotal, tax, discount, total).
- [ ] Task: Implement a `TransactionService` to handle core calculations and validation of line items.
- [ ] Task: Write unit tests for multi-tenant isolation (ensuring `tenant_id` consistency across headers and details).
- [ ] Task: Implement tenant isolation checks within the `TransactionService`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core Validation & Calculation Logic' (Protocol in workflow.md)

## Phase 3: Inventory Integration & Safety Checks
This phase integrates real-time stock validation and ensures transactions are atomic.

- [ ] Task: Write unit tests for real-time stock validation during the transaction creation process.
- [ ] Task: Implement a pre-commit inventory check within the `TransactionService`.
- [ ] Task: Write unit tests for atomic transaction commits (ensuring header and details are saved together).
- [ ] Task: Implement the atomic create transaction logic using Prisma transactions.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Inventory Integration & Safety Checks' (Protocol in workflow.md)

## Phase 4: API Routes & Auditing
This phase exposes the transaction logic via API routes and ensures auditing fields are correctly populated.

- [ ] Task: Write integration tests for the `POST /api/transactions` endpoint.
- [ ] Task: Implement the API route to handle transaction creation, including capturing `ip_address` and `user_agent`.
- [ ] Task: Write integration tests for fetching transactions (ensuring tenant-level filtering).
- [ ] Task: Implement the API route to list transactions for the current tenant.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: API Routes & Auditing' (Protocol in workflow.md)
