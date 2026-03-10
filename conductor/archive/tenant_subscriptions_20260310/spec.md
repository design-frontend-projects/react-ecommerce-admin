# Specification: Tenant Subscriptions Management

## Overview
Implement a comprehensive subscriptions management module to control tenant access based on payment status. This module allows `admin` and `super_admin` users to manage subscription plans (1, 3, 6, and 12 months) for individual users (tenants) authenticated via Clerk. Access to the entire system will be enforced based on the active subscription status.

## Functional Requirements

### 1. Data Modeling (Prisma & Supabase)
- **`subscriptions` table:** Defines available plans.
    - Fields: `id`, `name` (1 Month, etc.), `duration_months`, `price`, `created_at`.
- **`tenant_subscriptions` table:** Tracks individual user subscriptions.
    - Fields: `id`, `clerk_user_id`, `email`, `subscription_id`, `status` (new, paid, canceled), `start_date`, `end_date`, `created_at`, `updated_at`.

### 2. User Management & Assignment
- Ability to list users from the Clerk server within the admin module.
- Search and select users by ID and Email to assign or update a subscription record.
- Access restricted strictly to roles: `admin`, `super_admin`.

### 3. Subscription Lifecycle & Status
- **Plans:** 1 month, 3 months, 6 months, yearly.
- **Status workflow:** Manual updates by `super_admin` to transition records between `new`, `paid`, and `canceled`.
- History tracking: Every subscription change should create a new record for easy auditing.

### 4. System-Wide Enforcement (Access Control)
- Implement a global check (middleware or layout-level guard) that verifies the authenticated Clerk user's subscription status.
- **Behavior:** If a user has no active "paid" subscription, or if the current date is past the `end_date`, redirect the user to a "Subscription Required" page and block all other application features.

### 5. Subscription Dashboard
- A dedicated dashboard view for admins to monitor the health of the subscription system.
- **Metrics:**
    - Total Active Subscriptions.
    - Total Revenue (based on 'paid' records).
    - Upcoming Expirations (subs ending in the next 7-30 days).
    - New Subscriptions (signups in the current period).

## Acceptance Criteria
- [ ] Users without a 'paid' subscription cannot access any application routes except the subscription notice.
- [ ] Admins can successfully link a Clerk user to a subscription plan.
- [ ] `super_admin` can manually toggle subscription statuses.
- [ ] Subscription duration logic correctly calculates `end_date` from `start_date`.
- [ ] Dashboard accurately reflects data from the `tenant_subscriptions` table.

## Out of Scope
- Automated payment gateway integration (e.g., Stripe/PayPal).
- Clerk Organization-level subscriptions (this module targets individual users).
- Self-service subscription upgrades for non-admin users.
