# Protocol Specification: RUM Beacon Transport & Event Ingestion

> **Transport:** HTTPS POST / Beacon  
> **Endpoint:** `https://buffer.speedy.site/collect`  
> **Status:** Active / Production  

---

## 1. Transport & Request Headers

RUM beacons are transmitted asynchronously by the browser collector (`rum.js`) via `navigator.sendBeacon` or `fetch`. The beacon body is JSON, but the `sendBeacon` content type is `text/plain;charset=UTF-8` so it remains a CORS-safelisted request and does not require a preflight:

```http
POST /collect HTTP/1.1
Host: buffer.speedy.site
Content-Type: text/plain;charset=UTF-8
Origin: https://example.com
Referer: https://example.com/blog/sample-post
```

### Ingestion Constraints

| Parameter | Constraint | Error Code |
| :--- | :--- | :--- |
| **Max Payload Size** | 65,536 bytes (64 KB), checked against actual body bytes | `413 Payload too large` |
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

## 5. Schema Version 2 Contract

Schema version 2 is the canonical pageview contract defined by ADR-0004. The collector sends compact canonical facts and bounded evidence. The Worker remains responsible for authentication, edge enrichment, normalization, and persistence.

### 5.1 Request envelope

```json
{
  "schema_version": 2,
  "pageview_id": "9f31c0c4-4d8e-4a93-9d37-5f4e37b0f311",
  "session_id": "opaque-session-id",
  "current_page": "/products/widget",
  "previous_page": "/",
  "referrer_domain": "google.com",
  "facts": {
    "client": {
      "device_type": "desktop",
      "browser_family": "chrome",
      "os_family": "windows",
      "device_memory_gb": 8,
      "language": "en-US",
      "network": {
        "effective_type": "4g",
        "rtt_ms": 100,
        "downlink_mbps": 10,
        "poor_connection": false
      }
    },
    "navigation": {
      "ttfb_ms": 3432,
      "backend_ms": 2312,
      "dns_ms": 95,
      "connect_ms": 1018,
      "redirect_ms": 0,
      "queue_ms": 0,
      "cache_status": "unknown",
      "transfer_bytes": 28807,
      "decoded_bytes": 285511
    },
    "vitals": {
      "fcp": { "value_ms": 5620, "rating": "poor" },
      "lcp": { "value_ms": 6204, "rating": "poor" },
      "cls": { "value": 0.18, "rating": "poor" },
      "inp": null,
      "ttfb": { "value_ms": 3432, "rating": "poor" }
    },
    "resources": {
      "request_count": 29,
      "transfer_bytes": 104965,
      "by_type": {
        "script": { "count": 16, "duration_ms": 32946, "bytes": 67724 }
      }
    },
    "diagnostics": {
      "long_task_count": 2,
      "failed_resource_count": 1,
      "error_count": 1
    }
  },
  "evidence": {
    "lcp": [],
    "render_blockers": [],
    "slow_resources": [],
    "cls_shifts": [],
    "inp": null,
    "errors": []
  }
}
```

### 5.2 Continuation envelope

A continuation beacon uses the same `pageview_id` and may contain only newly observed values. It must not repeat canonical facts already sent unless a later value supersedes the previous value.

```json
{
  "schema_version": 2,
  "pageview_id": "9f31c0c4-4d8e-4a93-9d37-5f4e37b0f311",
  "session_id": "opaque-session-id",
  "current_page": "/products/widget",
  "previous_page": "/",
  "referrer_domain": "google.com",
  "facts": {
    "vitals": {
      "inp": { "value_ms": 380, "rating": "needs-improvement" }
    }
  },
  "evidence": {
    "inp": {
      "target": "button#pay",
      "event_type": "click",
      "input_delay_ms": 40,
      "processing_ms": 240,
      "presentation_ms": 100,
      "scripts": []
    }
  }
}
```

### 5.3 Compatibility rules

- The browser collector emits version 2. Version 1 and version 2 beacons are accepted during rollout.
- The Worker creates the legacy `events` projection from version 2 after canonical normalization. Legacy dashboards continue reading that array while typed columns become the primary source for migrated readers.
- The Worker derives the tenant domain from Origin or Referer and never from collector data.
- A missing `schema_version` means version 1.
- Version 2 rejects unknown top-level sections and malformed typed values.
- A version 2 beacon must contain `pageview_id`, `session_id`, `current_page`, `facts`, and `evidence`. `referrer_domain` is nullable and required only when an external referrer is known.
- Continuation beacons merge by `pageview_id` and may be delivered in any order.
- A flush batch may contain the same `pageview_id` more than once. The database RPC applies each payload as a separate upsert so retries and continuations merge safely without a duplicate-row conflict.
- Stored canonical columns are nullable. Null means the fact was not observed or is unavailable, never that the value was zero.
- The database retains the first non-null first-party context. Later non-null metric observations may supersede earlier metrics. Legacy event arrays append, and diagnostic evidence merges shallowly by top-level section.
- The Worker rejects malformed or oversized payloads before buffering.

### 5.4 Normalization rules

| Field | Normalization |
| :--- | :--- |
| `current_page`, `previous_page` | Keep the path only. Remove the fragment and all query values until a safe allowlist is explicitly documented and implemented. |
| `referrer_domain` | Lowercase hostname only. Remove `www.` and return null for an internal navigation. Never include the full referrer URL. |
| `pageview_id`, `session_id` | Accept only opaque IDs matching the documented length and character policy. Never derive either from a URL. |
| `device_type` | One of `desktop`, `mobile`, `tablet`, or `unknown`. |
| `browser_family`, `os_family` | Lowercase coarse families only, such as `chrome`, `safari`, `firefox`, `windows`, `android`, or `ios`. |
| `device_memory_gb` | Integer from 0 to 256. Values above 16 are stored as 16. |
| `network.effective_type` | One of `slow-2g`, `2g`, `3g`, `4g`, or `unknown`. |
| `network.rtt_ms` | Non-negative integer, rounded to the nearest 25 ms and capped at 6000 ms. |
| `network.downlink_mbps` | Non-negative number rounded to one decimal place and capped at 1000 Mbps. |
| Navigation timings | Non-negative integer milliseconds. Derived totals are not sent when they can be recalculated. |
| Web Vital values | FCP, LCP, INP, and TTFB are non-negative integer milliseconds. CLS is a non-negative number rounded to four decimal places. |
| Ratings | One of `good`, `needs-improvement`, `poor`, or null. The collector owns rating calculation. |
| Resource counts and bytes | Non-negative integers. |

### 5.5 Redaction rules

- Never store a full user-agent string.
- Never store raw IP addresses.
- Never store the raw Cloudflare organization string.
- Never store URL credentials or fragments.
- Never store a complete error stack.
- Never store an unbounded resource list, CLS geometry, or interaction trace.
- Normalize diagnostic URLs before they cross the Worker boundary. Remove credentials, fragments, and non-allowlisted query values.
- Store a coarse provider label only when it can be derived without retaining the original organization string.

### 5.6 Evidence limits and ranking

| Evidence | Limit | Ranking rule |
| :--- | :--- | :--- |
| LCP candidates | 3 | Highest LCP impact, then candidate order from the browser attribution. |
| Render blockers | 3 | Latest finish time before FCP, then greatest FCP delay. |
| Slow or failed resources | 5 | Failed resources first, then greatest total duration, then transfer bytes. |
| CLS shift sources | 3 | Greatest session-shift impact, then greatest viewport ratio. |
| INP scripts or targets | 3 | Greatest script duration, then greatest interaction duration. |
| Error signatures | 5 | Greatest occurrence count, then earliest first-seen offset. |

Every retained evidence item must have a compact URL or selector, a timing or impact value, and the minimum fields needed to explain the issue. Full phase detail is retained only for ranked resource candidates.

ADR-0005 narrows the retained product contract to Web Vitals, Page Groups, Images, and Fonts. The following evidence fields are required for those surfaces:

- LCP: target, URL, resource delay and duration, render delay, candidate TTFB, transfer bytes, decoded bytes, image width, image height, lazy state, fetch priority, and font family, weight, size, URL, and transfer size when applicable.
- CLS: target, bounded involved elements, shift value, viewport ratio, time, load state, area delta, distance moved, dx, dy, previous rectangle, and current rectangle.

The Worker must normalize these fields and keep serialized diagnostic evidence below 3.8 KB. PostgreSQL retains a 4 KiB limit as the final storage guard. URLs and selectors remain subject to the redaction rules in section 5.5. The legacy `events` projection remains part of the wire-to-storage compatibility flow until retained reader parity is complete.

### 5.7 Payload size test cases

The v2 implementation must include these deterministic cases:

| Case | Required result |
| :--- | :--- |
| Passive desktop visit | Body under 8192 bytes and no forbidden field. |
| Passive mobile visit | Body under 8192 bytes and correct coarse device class. |
| Interactive visit with INP | Body under 8192 bytes and at most 3 INP scripts. |
| Slow page with many resources | Body under 8192 bytes and at most 5 resource candidates. |
| Large resource waterfall | At most 5 resource candidates and body under 8192 bytes. |
| Error storm | At most 5 error signatures and no stack text. |
| URL with credentials, fragment, and unsafe query | Credentials and fragment removed, unsafe query removed. |
| Continuation beacon | No repeated facts and one merged row per `pageview_id`. |
| Unknown schema version | Request rejected with a structured error. |
| Oversized request | Request rejected before buffering. |

The Phase 0 fixture payloads are in `tests/fixtures/rum/`. They document the current version 1 size shape. Version 2 fixtures and implementation assertions are added in Phase 2.

- `413 Payload too large`: Content-Length exceeds 65,536 bytes.
