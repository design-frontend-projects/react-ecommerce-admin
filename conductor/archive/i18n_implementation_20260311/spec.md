# Specification: Internationalization (i18n) Implementation

## 1. Overview
This track aims to implement full internationalization (i18n) support for the entire application, focusing on two languages: English (en) and Arabic (ar). The implementation will include translating labels, messages, and fields across all core modules, with automatic layout direction (LTR/RTL) switching.

## 2. Functional Requirements

### 2.1 Language Support
- Support for English (en) and Arabic (ar).
- Default language: English (en).
- Automatic direction switching: 
    - `en` -> `ltr`
    - `ar` -> `rtl`

### 2.2 Translation Coverage
- **Core UI & Navigation:** Sidebar items, top bar elements, and global search.
- **Dashboard & Stats:** Labels for charts, statistics, and activity feeds.
- **POS Module:** Product names, cart labels, payment methods, and receipt templates.
- **Management Modules:** 
    - Inventory (Products, Categories)
    - Customer Management (Groups, Cards)
    - User Management (Roles, Permissions)
    - Suppliers & Purchase Orders
- **Auth & Profile:** Sign-in/Sign-up forms, profile settings, and account management.

### 2.3 Translation Management
- **Storage:** Bundled JSON files located in `src/assets/i18n/`.
- **Naming Convention:** Use a hierarchical key structure (e.g., `dashboard.stats.total_sales`).

### 2.4 User Interface
- **Language Switcher:** A dropdown or toggle located in the **Top Navigation Bar**, adjacent to existing theme/search controls.
- **Persistence:** Save the user's language preference in a cookie or local storage, synced with the existing `dir` cookie.

## 3. Technical Implementation
- **Framework:** `react-i18next` with `i18next`.
- **Direction Handling:** Integrate with the existing `DirectionProvider` to ensure layout switches correctly when the language changes.
- **Components:** Update existing components to use the `useTranslation` hook or the `<Trans />` component.

## 4. Acceptance Criteria
- [ ] Language switcher functions correctly in the top navigation bar.
- [ ] Switching to Arabic triggers RTL layout and updates all translated text.
- [ ] All major modules (Dashboard, POS, Inventory, etc.) are fully translated.
- [ ] Language preference persists across browser refreshes.
- [ ] RTL layout transitions are smooth and don't break UI components (e.g., charts, tables).

## 5. Out of Scope
- Dynamic data translation (e.g., user-generated product descriptions or comments).
- Support for more than 2 languages in this initial phase.
- Localization of date/time formats beyond what's handled by standard libraries.
