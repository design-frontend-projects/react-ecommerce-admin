# Track Specification: Lookups Module (Branches, Country, City, Currency)

## 1. Overview
The "Lookups Module" provides a centralized system for managing core business entities: Branches, Countries, Cities, and Currencies. This module will allow administrative users (Admin, Super Admin roles) to define and manage these entities, which serve as foundational data for other modules like POS, Transactions, and Customer management.

## 2. Functional Requirements
- **Data Models (Prisma & Supabase):**
  - **Country**: `id`, `name`, `iso_code`, `phone_code`, `currency_id`.
  - **City**: `id`, `name`, `country_id`, `state_code` (optional).
  - **Currency**: `id`, `name`, `symbol`, `code`, `exchange_rate`.
  - **Branch**: `id`, `name`, `address`, `phone`, `city_id`, `currency_id`, `is_active`.
- **Relationships:**
  - `Country` -> `City` (one-to-many).
  - `Country` -> `Currency` (one-to-one or many-to-one).
  - `City` -> `Branch` (one-to-many).
  - `Branch` -> `Currency` (many-to-one).
- **CRUD Operations:**
  - Create, Read, Update, and Delete operations for each entity.
  - Role-based access control (RBAC): Restricted to `admin` and `super_admin` roles.
  - Integrated with `data-table` component for listing and filtering.
- **UI & Navigation:**
  - **Side Menu**: New top-level "Lookups" menu with sub-items for Branches, Countries, Cities, and Currencies.
  - **Separate Pages**: Each entity will have its own dedicated route and page.
- **Data Initialization:**
  - Seed script to populate standard countries and currencies.

## 3. Non-Functional Requirements
- **Type Safety**: Full TypeScript implementation for all models and components.
- **Security**: Supabase RLS policies to enforce role-based access.
- **Performance**: Optimized database indexes for relationships and frequent lookups.
- **Responsiveness**: Mobile-friendly CRUD interfaces.

## 4. Acceptance Criteria
- [ ] Prisma schema updated with new models and relations.
- [ ] Database migrated to Supabase.
- [ ] Seed script successfully populates initial data.
- [ ] CRUD pages implemented for all 4 entities.
- [ ] Access control limits pages to Admin and Super Admin roles.
- [ ] "Lookups" menu visible in the sidebar with all sub-items.
- [ ] Unit and integration tests cover CRUD logic and RBAC.

## 5. Out of Scope
- Complex exchange rate synchronization (manual input for now).
- Multi-language support for entity names (beyond standard i18n implementation).
