# Specification: Tenant Subscription Module

## 1. Overview

This document outlines the requirements for enhancing the `subscription-required.tsx` component to allow tenants to choose and register for a subscription. The new functionality will present subscription options in a modal dialog, handle the subscription process, and update the tenant's status accordingly.

## 2. Functional Requirements

### 2.1. Subscription Modal

- A modal dialog will be displayed to the user when they need to select a subscription.
- The modal will display a list of available subscription plans.
- Each plan will show the following details:
    - Plan Name
    - Price
    - Features
    - Duration
- The list of subscription plans will be fetched from the backend.

### 2.2. Subscription and Payment Flow

- The user will be able to select a subscription plan from the modal.
- The payment process will be handled directly within the modal.
- A mock payment system will be used for the initial implementation.
- Upon successful subscription, the user will be redirected to the home page.

### 2.3. Database Schema

The following table will be used to store tenant subscription information:

```sql
create table public.tenant_subscriptions (
    id uuid not null default gen_random_uuid (),
    clerk_user_id character varying(255) not null,
    email character varying(255) not null,
    subscription_id integer not null,
    status public.subscription_status not null default 'new'::subscription_status,
    start_date timestamp without time zone null,
    end_date timestamp without time zone null,
    created_at timestamp without time zone null default CURRENT_TIMESTAMP,
    updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
    commission_amount numeric(10, 2) null default 0,
    commission_type public.subscription_commission_type not null default 'subscription'::subscription_commission_type,
    first_name text null,
    last_name text null,
    is_owner boolean null,
    constraint tenant_subscriptions_pkey primary key (id),
    constraint tenant_subscriptions_subscription_id_fkey foreign KEY (subscription_id) references subscriptions (id)
);
create index IF not exists idx_tenant_subscriptions_clerk_id on public.tenant_subscriptions using btree (clerk_user_id) TABLESPACE pg_default;
create index IF not exists idx_tenant_subscriptions_status on public.tenant_subscriptions using btree (status) TABLESPACE pg_default;
```

## 3. Non-Functional Requirements

- The user interface should be creative and easy to use.
- The system should be secure and prevent unauthorized access.

## 4. Acceptance Criteria

- When a user without an active subscription accesses a protected route, a subscription modal is displayed.
- The modal correctly displays the available subscription plans with their details.
- The user can select a plan and complete the mock payment process.
- After successful payment, the user's subscription status is updated in the database.
- The user is redirected to the home page after a successful subscription.
- A user with a paid subscription and `is_owner = true` can access the application.

## 5. Out of Scope

- Integration with a real payment gateway (e.g., Stripe, PayPal).
- Management of subscription plans by administrators.
- Handling of subscription cancellations and refunds.
