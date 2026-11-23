# Protocol Specification: WordPress Plugin HMAC Handshake

> **Transport:** HTTPS JSON POST  
> **Endpoints:** `/api/wordpress/hmac`, `/api/wordpress/hmac/verify`, `/api/wordpress/injection`  
> **Status:** Active / Production  

---

## 1. Handshake Flow & Wire Sequence

The plugin onboarding and verification sequence ensures mutual domain ownership without manual secret exchange:

```mermaid
sequenceDiagram
    autonumber
    actor User as Dashboard User
    participant SaaS as Next.js API
    participant DB as Supabase DB
    participant WP as WordPress Plugin

    User->>SaaS: POST /api/wordpress/hmac { domain }
    SaaS->>SaaS: Compute HMAC-SHA256 signature
    SaaS->>DB: Upsert signature with 24h TTL into wp_key
    SaaS-->>User: 200 OK { signature, expiresAt }
    User->>WP: Install plugin bundle with baked signature
    WP->>SaaS: POST /api/wordpress/hmac/verify { domain, signature }
    SaaS->>DB: Constant-time compare signature & check expiry
    SaaS->>DB: Stamp hmac_verified_at, rum_assigned_at
    SaaS-->>WP: 200 OK { verified: true }
```

---

## 2. Signature Generation & Verification Framing

### Signature Generation Specification
- **Algorithm:** HMAC-SHA256
- **Secret Key:** `WP_HMAC_SECRET` (server-side environment variable)
- **Message Format:** `${normalizedDomain}:${timestamp}:${nonce}`
- **TTL Window:** 24 hours (86,400,000 ms)

### Request / Response Schemas

#### Step 1: Prepare Signature
- **Endpoint:** `POST /api/wordpress/hmac`
- **Request Body:**
  ```json
  {
    "domain": "example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "signature": "a7b8c9d0...",
    "expiresAt": "2026-11-22T14:12:00.000Z"
  }
  ```

#### Step 2: Verification Handshake
- **Endpoint:** `POST /api/wordpress/hmac/verify`
- **Request Body:**
  ```json
  {
    "domain": "example.com",
    "signature": "a7b8c9d0..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "verified": true
  }
  ```
- **Response (400 Bad Request):**
  ```json
  {
    "error": "Invalid or expired signature"
  }
  ```

---

## 3. Dynamic RUM Injection Decision Protocol

- **Endpoint:** `POST /api/wordpress/injection`
- **Request Body:**
  ```json
  {
    "domain": "example.com"
  }
  ```
- **Response when entitled (200 OK):**
  ```json
  {
    "inject": true,
    "scriptUrl": "https://rum.speedy.site/rum.js"
  }
  ```
- **Response when not entitled or free (200 OK):**
  ```json
  {
    "inject": false
  }
  ```
