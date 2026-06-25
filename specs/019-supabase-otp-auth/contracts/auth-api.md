# Auth & Subscription API Contracts

This contract defines the interfaces, endpoints, and data payloads between the application frontend, backend API routes, and the database/Supabase Auth services.

## 1. Authentication Endpoints

These contracts represent interface boundaries for OTP authentication.

### `POST /api/auth/otp/send`
Requests Supabase Auth to generate and send a 6-digit OTP to the user's email.

- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "OTP successfully sent to user@example.com",
    "cooldown_seconds": 30
  }
  ```
- **Response `400 Bad Request`**:
  ```json
  {
    "success": false,
    "error": "Invalid email address format"
  }
  ```
- **Response `429 Too Many Requests`**:
  ```json
  {
    "success": false,
    "error": "Rate limit exceeded. Please wait 15 minutes before requesting another OTP."
  }
  ```

---

### `POST /api/auth/otp/verify`
Verifies the 6-digit OTP against Supabase Auth. Establishes the user session on success.

- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "token": "123456"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "session": {
      "access_token": "jwt-access-token",
      "refresh_token": "jwt-refresh-token",
      "user": {
        "id": "supabase-user-uuid",
        "email": "user@example.com"
      }
    }
  }
  ```
- **Response `401 Unauthorized`**:
  ```json
  {
    "success": false,
    "error": "Invalid or expired OTP code"
  }
  ```

---

## 2. Onboarding Endpoints

### `POST /api/tenant/onboard`
Submits onboarding profile details to update the tenant workspace metadata.

- **Request Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer jwt-access-token`
- **Request Body**:
  ```json
  {
    "company_name": "Acme Restaurant Group",
    "billing_contact": "billing@acme.com",
    "timezone": "America/New_York",
    "industry": "Food & Beverage"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "tenant": {
      "id": "tenant-subscription-uuid",
      "first_use": false,
      "company_name": "Acme Restaurant Group",
      "status": "paid"
    }
  }
  ```
- **Response `400 Bad Request`**:
  ```json
  {
    "success": false,
    "error": "Missing required fields: company_name, billing_contact"
  }
  ```
- **Response `401 Unauthorized`**:
  ```json
  {
    "success": false,
    "error": "Invalid session token"
  }
  ```

---

## 3. Subscription Verification Hook / Middleware

### `GET /api/tenant/subscription/status`
Checks the active subscription details for the authenticated user's tenant.

- **Request Headers**:
  - `Authorization: Bearer jwt-access-token`
- **Response `200 OK` (Active)**:
  ```json
  {
    "tenant_id": "tenant-subscription-uuid",
    "status": "paid",
    "end_date": "2026-12-31T23:59:59Z",
    "is_active": true,
    "first_use": false
  }
  ```
- **Response `200 OK` (Expired)**:
  ```json
  {
    "tenant_id": "tenant-subscription-uuid",
    "status": "canceled",
    "end_date": "2026-06-20T12:00:00Z",
    "is_active": false,
    "first_use": false
  }
  ```
- **Response `404 Not Found`**:
  ```json
  {
    "success": false,
    "error": "No tenant subscription record found for authenticated user"
  }
  ```
