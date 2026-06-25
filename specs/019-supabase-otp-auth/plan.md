# Implementation Plan: Supabase OTP Authentication, Onboarding, and Subscription Management

**Branch**: `019-supabase-otp-auth` | **Date**: 2026-06-25 | **Spec**: [/specs/019-supabase-otp-auth/spec.md](file:///E:/web-projects/web-mobile-work-apps/react-ecommerce-restuarant/specs/019-supabase-otp-auth/spec.md)
**Input**: Feature specification from `/specs/019-supabase-otp-auth/spec.md`

## Summary

This feature replaces the existing Clerk authentication system with a secure Supabase Email OTP (one-time passcode) authentication mechanism. Upon login, the system will run middleware/routing checks to verify if the tenant is logging in for the first time (`first_use` flag is true, prompting the onboarding modal) and whether they have an active subscription (redirecting/blocking with a renewal portal if expired).

## Technical Context

**Language/Version**: TypeScript 5.0+ (Node.js 20+)  
**Primary Dependencies**: React 18, Next.js (TanStack Start/Router), @supabase/supabase-js, TanStack Query, React Hook Form, Zod, shadcn/ui  
**Storage**: PostgreSQL (via Prisma 7)  
**Testing**: Vitest  
**Target Platform**: Responsive Web Browsers  
**Project Type**: Web Application  
**Performance Goals**: OTP delivery API request < 1.5s, session/subscription validation gating < 100ms  
**Constraints**: Zero Clerk dependencies/references in production bundle; session token verification must occur server-side/middleware  
**Scale/Scope**: Multi-tenant workspace configuration and subscription validation gating for all users  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Modular UI Design**: Components for OTP, Onboarding, and Renewal modals are self-contained and located in `src/components/auth/`. (PASS)
- **TDD (Test-First)**: Validation schemas and helper utilities will have associated Vitest tests created before UI layout implementation. (PASS)
- **API Contracts**: All API endpoints and client hooks conform to the defined contract specification. (PASS)
- **Security & RLS**: Session tokens from Supabase Auth will be validated on both client/server sides. Prisma 7 queries enforce scope based on user tenant IDs. (PASS)

## Project Structure

### Documentation (this feature)

```text
specs/019-supabase-otp-auth/
├── plan.md              # This file
├── research.md          # Technical decisions and OTP API investigations
├── data-model.md        # Prisma schema updates and entity validation rules
├── quickstart.md        # Setup guide for Supabase Auth and migrations
└── contracts/           
    └── auth-api.md      # API request/response structures
```

### Source Code (repository root)

```text
src/
├── components/
│   └── auth/
│       ├── LoginEmailForm.tsx        # Email submission
│       ├── LoginOtpForm.tsx          # OTP verification
│       ├── OnboardingModal.tsx       # Onboarding flow
│       └── SubscriptionRenewModal.tsx# Subscription gate/renewal
├── lib/
│   └── supabase.ts                  # Supabase client initialization
├── routes/
│   └── auth/                         # Authentication route handlers
└── generated/
    └── prisma/                       # Generated Prisma client types
```

**Structure Decision**: Single React/TanStack Start application structure utilizing `src/` directory.

## Complexity Tracking

*No constitution check violations exist.*
