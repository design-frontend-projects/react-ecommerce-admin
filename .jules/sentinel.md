## 2026-01-16 - Data Sanitization Helper
**Vulnerability:** UI components were displaying sensitive form data (passwords, OTPs) in cleartext via `showSubmittedData`.
**Learning:** Generic helpers that display data for debugging or confirmation must be aware of sensitive fields to prevent accidental exposure.
**Prevention:** Implemented a JSON replacer function in `showSubmittedData` to redact keys matching sensitive patterns while preserving data structures and preventing regression.

## 2026-01-24 - Insecure Cookie Storage
**Vulnerability:** Cookies were being set without `SameSite` or `Secure` attributes, exposing them to CSRF and network interception.
**Learning:** Custom cookie utilities often miss secure defaults that libraries like `js-cookie` might encourage or document more clearly.
**Prevention:** Enforce `SameSite=Lax` and conditional `Secure` attributes in all cookie setting logic.

## 2026-01-28 - Weak Password Policy
**Vulnerability:** The password validation only checked for a minimum length of 7 characters, allowing weak passwords like "1234567".
**Learning:** Client-side validation is the first line of defense against weak passwords. Shared schemas prevent inconsistency across different auth flows (Sign Up vs Forgot Password).
**Prevention:** Implemented a reusable `passwordSchema` in `src/lib/password-validation.ts` enforcing uppercase, lowercase, numbers, and special characters, applied to Sign Up and Password Reset forms.

## 2026-02-18 - Inconsistent Password Policy in Admin Actions
**Vulnerability:** The User creation/edit dialog (`UsersActionDialog`) implemented its own password validation logic which was weaker than the global policy (missing uppercase and special character requirements).
**Learning:** When multiple forms handle similar data (like passwords), they should strictly use a shared validation schema to avoid policy drift. "Don't Repeat Yourself" (DRY) is a security principle too.
**Prevention:** Refactored `UsersActionDialog` to use the shared `passwordSchema` via `zod.superRefine`, ensuring the admin interface enforces the same strong password requirements as the public sign-up flows.
