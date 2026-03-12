# Implementation Plan: Internationalization (i18n) Implementation

## Phase 1: Foundation & UI Setup
Focus on setting up the core infrastructure and the language switcher UI.

- [ ] Task: Refactor `src/config/i18n.ts` to use bundled JSON files from `src/assets/i18n/`.
- [ ] Task: Create a `LanguageSwitcher` component using Shadcn UI components (e.g., Dropdown or Toggle).
- [ ] Task: Integrate `LanguageSwitcher` into `src/components/layout/top-nav.tsx` (or equivalent top bar).
- [ ] Task: Implement automatic direction switching logic in `LanguageSwitcher` to call `setDir` from `DirectionProvider`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & UI Setup' (Protocol in workflow.md)

## Phase 2: Core UI & Navigation Translation
Translate the global navigation and shared UI components.

- [ ] Task: Create initial translation keys for sidebar navigation items and shared UI (Buttons, Search, etc.).
- [ ] Task: Update `src/components/layout/sidebar.tsx` and related components to use the `useTranslation` hook.
- [ ] Task: Translate core layout components like global search and common dialog labels.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core UI & Navigation Translation' (Protocol in workflow.md)

## Phase 3: Module-Specific Translation (Dashboard & Management)
Apply translations to the main business modules.

- [ ] Task: Translate the Dashboard module (Labels, Charts, Stats).
- [ ] Task: Translate the Inventory and Management modules (Products, Categories, Suppliers).
- [ ] Task: Translate the Customer and User management modules.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Module-Specific Translation' (Protocol in workflow.md)

## Phase 4: POS Module Translation
Translate the complex POS interface, including receipts and payment flows.

- [ ] Task: Extract and translate all keys in the POS module (`src/features/pos/`).
- [ ] Task: Ensure the cart, receipt templates, and payment dialogs are fully localized.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: POS Module Translation' (Protocol in workflow.md)

## Phase 5: Auth & Profile Translation
Finalize the remaining user-facing areas.

- [ ] Task: Translate authentication pages (Sign-in, Sign-up, Clerk integration points).
- [ ] Task: Translate the user profile and settings pages.
- [ ] Task: Perform a final audit to ensure no hardcoded strings remain.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Auth & Profile Translation' (Protocol in workflow.md)
