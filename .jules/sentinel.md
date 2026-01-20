## 2026-01-16 - Data Sanitization Helper
**Vulnerability:** UI components were displaying sensitive form data (passwords, OTPs) in cleartext via `showSubmittedData`.
**Learning:** Generic helpers that display data for debugging or confirmation must be aware of sensitive fields to prevent accidental exposure.
**Prevention:** Implemented a JSON replacer function in `showSubmittedData` to redact keys matching sensitive patterns while preserving data structures and preventing regression.

## 2026-01-24 - Insecure Cookie Management
**Vulnerability:** Authentication tokens and UI state were stored in cookies without `Secure` or `SameSite` attributes, risking token leakage and CSRF.
**Learning:** Manual `document.cookie` manipulation often misses security defaults. Centralized cookie helpers must enforce strict security policies (Secure on HTTPS, SameSite=Lax/Strict) by default.
**Prevention:** Updated `src/lib/cookies.ts` to enforce `Secure` (when HTTPS) and `SameSite=Lax` on all cookies, and refactored direct `document.cookie` usage to use this secure helper.
