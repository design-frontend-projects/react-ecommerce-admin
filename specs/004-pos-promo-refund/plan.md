# Implementation Plan: Captain POS & Promotions

**Branch**: `004-pos-promo-refund` | **Date**: 2026-04-01 | **Spec**: `/specs/004-pos-promo-refund/spec.md`

## Summary

Build a high-performance, premium POS interface for restaurant "Captain's View" that handles order taking, promotion application, and admin-led refunds. 

Technical approach:
1.  **Stateful POS**: persist cart and applied promos in `useResposStore` (Zustand).
2.  **Validator Integration**: Use the existing `validatePromoCode` in the `OrderPanel`.
3.  **Admin Refund Workflow**: Implement a secure refund trigger restricted to admin roles.

## Technical Context

**Language/Version**: TypeScript 5.x / React + Vite  
**Primary Dependencies**: lucide-react, sonner, framer-motion, zustand, shadcn/ui  
**Storage**: Supabase (PostgreSQL)  
**Testing**: Vitest  
**Target Platform**: Web (Desktop & Tablet)
**Project Type**: Fullstack Web App  
**Performance Goals**: <100ms UI response for item selection, smooth 60fps animations.  
**Constraints**: Supabase RLS must be respected; Admin-only for refund operations.  
**Scale/Scope**: ~10 screens (including Captain station), ~200 menu items.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Principle I: Component-Based Architecture (Atomic Structure)
- [x] Principle II: Type Safety (Zod + TypeScript sync)
- [x] Principle III: Motion-First (Framer Motion for premium feel)
- [x] Principle IV: Zero CLS Target (Optimized image loading)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/features/respos/
├── components/
│   ├── pos/
│   │   ├── promo-input.tsx      # NEW: Premium promo code input
│   │   └── refund-dialog.tsx     # NEW: Admin refund interface
│   └── captain/
│       └── ready-table-card.tsx
├── hooks/
│   └── use-order-calc.ts        # NEW: Centralized discount/total calculation
├── lib/
│   └── promotion-validator.ts   # REFACTORED: Validating with fixed schema
└── pages/
    ├── pos.tsx                  # ENHANCED: Integrated promo & refund controls
    └── captain-dashboard.tsx    # ENHANCED: Table monitoring + Action triggers
```

**Structure Decision**: Using Atomic architecture inside the feature folder. Logic extracted to hooks for testability.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [None]    | [N/A]      | [N/A]                               |
