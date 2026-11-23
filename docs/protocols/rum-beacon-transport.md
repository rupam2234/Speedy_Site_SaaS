# Protocol Specification: RUM Beacon Transport & Event Ingestion

> **Transport:** HTTPS POST / Beacon  
> **Endpoint:** `https://buffer.speedy.site/collect`  
> **Status:** Active / Production  

---

## 1. Transport & Request Headers

RUM beacons are transmitted asynchronously by the browser collector (`rum.js`) via `navigator.sendBeacon` or `fetch`:

```http
POST /collect HTTP/1.1
Host: buffer.speedy.site
Content-Type: application/json
Origin: https://example.com
Referer: https://example.com/blog/sample-post
```

### Ingestion Constraints

| Parameter | Constraint | Error Code |
| :--- | :--- | :--- |
| **Max Payload Size** | 65,536 bytes (64 KB) | `413 Payload too large` |
| **Max Events / Request** | 200 events | Truncated silently |
| **Domain Validation** | Must match active paid `managed_wp` entitlement in Cloudflare KV | `403 Forbidden` |
| **CORS Support** | `OPTIONS` preflight supported; `Access-Control-Max-Age: 86400` | `200 OK` |

---

## 2. Wire Schema & JSON Framing

### Request Envelope

```json
{
  "pageview_id": "pv_9a8b7c6d5e",
  "sessionId": "sess_1a2b3c4d5e",
  "currentPage": "https://example.com/products/widget",
  "previousPage": "https://example.com/",
  "data": [
    {
      "type": "navigation-timing",
      "raw": {
        "startTime": 0,
        "requestStart": 120.4,
        "responseStart": 245.8,
        "domInteractive": 480.2,
        "loadEventEnd": 950.6
      }
    },
    {
      "type": "web-vital",
      "name": "LCP",
      "value": 1240.5,
      "rating": "good"
    }
  ]
}
```

---

## 3. Worker Ingestion & Storage Transformation

Upon ingestion in Cloudflare Durable Objects, requests are enriched with edge geo metadata:

```json
{
  "type": "geo-info",
  "country": "US",
  "city": "Ashburn",
  "continent": "NA",
  "siteDomain": "example.com",
  "timestamp": 1763734971000
}
```

The resulting batch payload is flushed to Supabase `rum_metrics`:

```json
{
  "pageview_id": "pv_9a8b7c6d5e",
  "session_id": "sess_1a2b3c4d5e",
  "domain_name": "example.com",
  "current_page": "https://example.com/products/widget",
  "previous_page": "https://example.com/",
  "events": [...],
  "created_at": "2026-11-21T14:12:51.000Z"
}
```

---

## 4. Response Codes

- `202 Data buffered`: Successfully validated and buffered in Durable Object memory.
- `400 Invalid data`: JSON parse error or malformed payload.
- `403 [Reason]`: Origin or Referer missing, not entitled, or expired.
- `405 Method Not Allowed`: HTTP method other than `POST` or `OPTIONS`.
- `413 Payload too large`: Content-Length exceeds 65,536 bytes.
