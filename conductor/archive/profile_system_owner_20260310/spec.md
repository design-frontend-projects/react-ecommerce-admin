# Specification: Profile & System Owner Management

## 1. Overview
This track introduces a new `profiles` table and an extensible `activity_types` system. It also implements a dedicated administrative dashboard and management suite for "System Owners" to oversee tenant profiles and subscriptions.

## 2. Functional Requirements

### 2.1 Database Schema updates
- **`activity_types` Table:**
  - `id`: UUID (Primary Key)
  - `name`: String (e.g., "Restaurant", "Pharmacy")
  - `description`: String (Optional)
  - Initial Seed: `restaurant`, `super_market`, `pharmacy`, `shop`, `online_shop`.
- **`profiles` Table:**
  - `profile_id`: UUID (Primary Key)
  - `clerk_user_id`: String (Unique, Indexed) - References the Clerk User ID.
  - `first_name`: String
  - `last_name`: String
  - `email`: String (Unique)
  - `activity_type_id`: UUID (Foreign Key to `activity_types`)
  - `is_owner`: Boolean - Set to `true` for tenant owners.
  - `system_owner`: Boolean - Set to `true` for platform administrators.
  - `created_at`: Timestamp
  - `updated_at`: Timestamp
- **Audit Logs Table:**
  - `id`: UUID (Primary Key)
  - `actor_id`: String (clerk_user_id)
  - `action`: String (e.g., "UPDATE_SUBSCRIPTION")
  - `target_id`: String (The ID of the profile or subscription affected)
  - `details`: JSONB
  - `created_at`: Timestamp

### 2.2 Profile Initialization Logic
- Upon first login, if no record exists in the `profiles` table for the authenticated Clerk User ID, a new profile must be created.
- The `is_owner` flag will be set based on application logic (e.g., first user of a tenant).

### 2.3 System Owner Management UI
- **Navigation:** New "System Management" section in the sidebar, visible only to users with `system_owner: true`.
- **Dashboard Stats:**
  - **Total Revenue:** Sum of all paid subscriptions.
  - **Expiring Soon:** Count of subscriptions ending within 30 days.
  - **Activity Distribution:** Chart/List showing the breakdown of tenants by activity type.
- **Profile Management:**
  - List view with search (by email, name, or activity type).
  - Detail view to update profile flags (`is_owner`, `system_owner`).
- **Subscription Management:**
  - Integrated with `tenant_subscriptions` table.
  - Create, Update, and Delete tenant subscriptions.
  - **Manual Date Overrides:** Direct editing of `start_date` and `end_date`.
- **Audit View:** Simple list to review recent administrative actions.

### 2.4 Notifications
- Implement a basic service to handle email notifications for subscription changes (creation, updates, or manual extensions).

## 3. Technical Requirements
- **Frontend:** React with ShadcnUI, TanStack Router, TanStack Table for lists.
- **Backend:** Prisma 7 for DB operations, Supabase as the data source.
- **Auth:** Clerk for authentication, custom middleware/guards to enforce `system_owner` checks.
- **Testing:** Vitest for unit/integration tests. Target >80% coverage.

## 4. Acceptance Criteria
- [ ] `profiles` and `activity_types` tables are created and seeded.
- [ ] Users automatically get a profile record on first login.
- [ ] Only `system_owner` can access the System Management UI.
- [ ] System owners can view dashboard statistics correctly.
- [ ] System owners can CRUD `tenant_subscriptions` for any profile.
- [ ] All manual changes are recorded in the audit log.
- [ ] Unit tests cover profile creation and subscription update logic.

## 5. Out of Scope
- Full payment gateway integration (Stripe/PayPal) - focus is on administrative management.
- Multi-region support for data sovereignty.
