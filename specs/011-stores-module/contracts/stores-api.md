# API Contracts: Stores Module

## API Endpoints

All endpoints use the exact field names defined in the `stores` model.

### 1. List All Stores
- **Method**: `GET`
- **Path**: `/api/stores`
- **Query Params**: `page` (optional), `limit` (optional), `search` (optional)
- **Response**:
  - `status`: `200 OK`
  - `body`: Array of `Store` objects.

### 2. Create Store
- **Method**: `POST`
- **Path**: `/api/stores`
- **Request Body**: `StoreInput` (validated by Zod)
- **Response**:
  - `status`: `201 Created`
  - `body`: The created `Store` record.

### 3. Get Store Details
- **Method**: `GET`
- **Path**: `/api/stores/{store_id}`
- **Response**:
  - `status`: `200 OK`
  - `body`: `Store` object.

### 4. Update Store
- **Method**: `PATCH` / `PUT`
- **Path**: `/api/stores/{store_id}`
- **Request Body**: Partial `StoreInput`
- **Response**:
  - `status`: `200 OK`
  - `body`: Updated `Store` record.

### 5. Delete Store
- **Method**: `DELETE`
- **Path**: `/api/stores/{store_id}`
- **Response**:
  - `status`: `204 No Content` / `200 OK (soft-delete confirmation)`

## Component Interfaces

- **StoreForm**: Receives initial data and onSubmit callback.
- **StoreList**: Receives store list and handling for edit/delete.
- **StoreStatusBadge**: Conditional styling based on `status` boolean.
