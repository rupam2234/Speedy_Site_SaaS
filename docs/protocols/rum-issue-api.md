# RUM Issue API Contract

> **Status:** Implemented for the Phase 1 LCP slice
> **Owner:** Speedy Site
> **Last updated:** 2026-11-26

All routes require an authenticated Supabase session. Site authority is resolved
from `orders`, never from an unverified browser domain. Customer access requires
site ownership, admins may access all sites, and experts require an active order
assignment.

## List issues

```http
GET /api/rum/issues?site_id=<orders.order_id>&status=<optional>
```

`site_id` is a canonical UUID. `status` is optional and must be one of:
`detected`, `reviewed`, `in_progress`, `fixed`, `verified`, `resolved`, or
`dismissed`.

```json
{
  "data": [
    {
      "id": "<uuid>",
      "site_id": "<uuid>",
      "issue_type": "slow_lcp_image",
      "status": "detected",
      "severity": "high",
      "confidence": 0.87,
      "title": "Poor mobile LCP from a recurring asset",
      "sample_count": 42,
      "session_count": 31
    }
  ]
}
```

Only published issues are returned.

## Get issue detail

```http
GET /api/rum/issues/<issue_id>?site_id=<orders.order_id>
```

The response contains the issue document plus bounded `evidence` and `history`
collections. The issue must belong to the authorized site and be published.

## Run LCP detection

```http
POST /api/rum/issues/detect
Content-Type: application/json

{
  "site_id": "<orders.order_id>",
  "start": "<optional ISO timestamp>",
  "end": "<optional ISO timestamp>",
  "publish": false
}
```

Only administrators may run detection. Requests are limited to ten per site
per hour. `publish` defaults to `false`, which keeps results in shadow mode.
Publishing is an explicit administrative action.

## Ask the site-wide performance assistant

```http
GET /api/rum/assistant?site_id=<orders.order_id>
```

Returns the structured performance context shown beside the conversation: the
published issue facts for the site and a per-device metric summary. The route
requires an authenticated user with site authority and a live `managed_wp`
entitlement for the site.

```json
{
  "data": {
    "siteId": "<uuid>",
    "domainName": "example.com",
    "issueCount": 2,
    "deviceIssueCount": 7,
    "issues": [
      {
        "id": "<uuid>",
        "issueType": "slow_lcp_image",
        "status": "detected",
        "severity": "high",
        "confidence": 0.87,
        "title": "Poor mobile LCP from a recurring asset",
        "symptom": "...",
        "rootCause": "...",
        "sampleCount": 42,
        "sessionCount": 31,
        "metricSummary": { "p75_lcp_ms": 4180 },
        "recommendedFix": ["..."],
        "expectedImpact": "...",
        "verificationPlan": "...",
        "firstSeenAt": "2026-11-20T00:00:00.000Z",
        "lastSeenAt": "2026-11-26T00:00:00.000Z"
      }
    ],
    "deviceSummary": [
      {
        "device": "mobile",
        "total": 5,
        "metrics": [
          { "metric": "LCP", "count": 3, "worst": "4.18 s on /pricing" }
        ]
      }
    ]
  }
}
```

```http
POST /api/rum/assistant
Content-Type: application/json

{
  "site_id": "<orders.order_id>",
  "question": "Which pages are hurting mobile first?",
  "issue_id": "<optional issue uuid>",
  "history": [{ "role": "user", "content": "..." }]
}
```

The route requires an authenticated user, canonical site ownership, and a live
`managed_wp` entitlement for that site. `issue_id` is optional and narrows the
authoritative facts to one published issue. `history` is optional and is
trimmed to the last six turns.

The browser cannot provide issue facts, evidence, tenant scope, or a retrieval
namespace. The server loads the published issue facts and the per-device
findings, retrieves tenant and site knowledge from the issue-knowledge Worker,
and generates an answer with citations, optional reference citations, and
explicit limitations.

```json
{
  "data": {
    "answer": "1. Start with /pricing on mobile ...",
    "citations": ["issue:<uuid>", "wp-rocket-image-delivery"],
    "limitations": [],
    "sources": [
      { "id": "issue:<uuid>", "title": "Poor mobile LCP", "kind": "issue" },
      { "id": "wp-rocket-image-delivery", "title": "WP Rocket image delivery checklist", "kind": "playbook" }
    ]
  },
  "cached": false
}
```

`cached` reports whether the answer was served from the answer cache. Citations
are filtered against the sources that were actually supplied, so a citation
outside that set is dropped.

Questions are limited to 1,000 characters. A site may ask thirty questions per
hour and a user one hundred and twenty per hour. Retrieved text is untrusted
reference material and cannot change the diagnosis, counts, site scope, workflow
state, or entitlement boundary.

The retired per-issue route `POST /api/rum/issues/<issue_id>/assistant` was
replaced by this site-scoped route, which supports the same focused flow
through the optional `issue_id` field.

## List device issue panels

```http
POST /api/rum/device-issues
Content-Type: application/json

{
  "domain": "<customer domain>"
}
```

The route resolves the submitted domain to an authoritative order and applies the same ownership, admin, and expert-assignment rules as the other RUM readers. It reads the retained LCP, CLS, INP, and TTFB readers together with the device-level LCP rollup reader in one parallel query and returns a minimal issue list for each device cohort. No issue document is created, published, or modified by this route.

```json
{
  "data": {
    "desktop": [
      {
        "id": "lcp-rollup:desktop",
        "metric": "LCP",
        "device": "desktop",
        "title": "Desktop LCP is poor",
        "page": "/the-5-best-window-bird-feeder-reviews-for-2018.htm",
        "asset": { "type": "element", "label": "#block-9>p.has-text-align-center.wp-block-paragraph", "url": null },
        "value": 6278.5,
        "valueLabel": "6.28 s",
        "rating": "poor",
        "impact": "p75 LCP 6.28 s across 16 different pages, 10 of 16 pageviews were poor",
        "fixes": ["The element \"#block-9>p.has-text-align-center.wp-block-paragraph\" is the LCP element on 4 pageviews, start there"],
        "details": [
          { "label": "p75 LCP", "value": "6.28 s" },
          { "label": "Median LCP", "value": "6.27 s" },
          { "label": "Pageviews", "value": "16" },
          { "label": "Poor pageviews", "value": "10" },
          { "label": "Pages affected", "value": "10" }
        ],
        "summary": true
      },
      {
        "id": "cls:desktop:/pricing:div.banner.ad-slot",
        "metric": "CLS",
        "device": "desktop",
        "title": "Layout shift on a page element",
        "page": "/pricing",
        "asset": { "type": "element", "label": "div.banner.ad-slot", "url": null },
        "value": 0.18,
        "valueLabel": "0.180",
        "rating": "needs-improvement",
        "impact": "CLS 0.180 across 9 shifts",
        "fixes": ["Reserve fixed space for the element so it does not move when content loads"],
        "details": [{ "label": "CLS score", "value": "0.180" }]
      }
    ],
    "mobile": [],
    "tablet": []
  }
}
```

Only observations that exceed a Core Web Vitals threshold are returned: LCP p75 above 2.5 s, CLS above 0.1, INP above 200 ms, and TTFB p75 above 800 ms. The route returns at most thirty rows per metric, which is five client pages of six rows. Asset type and label are derived from the retained reader output so the customer can identify the affected image, font, script, stylesheet, element, or page.

The panel shows six rows per metric group at a time. When a group holds more than six issues the panel renders previous and next controls with a page counter, so every returned issue stays reachable without a long scroll. The controls are per device and per metric, and they appear only when more than one page exists.

### Device-level LCP verdict

The element reader `analyze_lcp_by_device` only returns a `(page, element)` group that was observed at least five times. A device whose slow pageviews are spread across many pages therefore produces no LCP row, even when most of its pageviews are poor. That disagreement with the distribution chart is the reason the reader `analyze_lcp_device_rollup` exists. The decision is recorded in [ADR-0010](../adr/0010-device-level-lcp-verdict-reader.md).

`analyze_lcp_device_rollup(domain_filter text)` reports the LCP verdict per device over the same seven day window and the same `public.rum_lcp_candidates` source as the element reader, so the panel and the chart agree. It returns the pageview, good, needs-improvement, and poor counts, the p50 and p75 LCP, the distinct page and target counts, the number of poor pages, the slowest page with its LCP, and the most repeated LCP target with its count and p75. It is restricted to `service_role`.

A rollup becomes an issue when the device has at least five pageviews and a p75 LCP above 2.5 s. That row carries `summary: true`, is ordered first within its device, and is rendered with a "Device wide" badge. The element rows remain unchanged, so a device with a repeated slow element shows both the device verdict and the element cause.

The rollup reader is additive and fails open. If it errors, the element level issues are still returned and the device verdict is simply absent.

### Reader window and limits

The panel reads the last seven days, which is the window used by the retained LCP element reader and by the distribution chart.

The panel inherits the retained reader limits. The LCP element reader returns at most thirty aggregated rows for the whole site ordered by p75 LCP, so a device can be absent from the element rows when another device dominates that list, which is why the device verdict is published independently. The TTFB reader already filters to pages above 800 ms.

## Errors

Errors use a stable JSON shape:

```json
{
  "error": "forbidden",
  "message": "You do not have access to this site."
}
```

Representative status codes are `400` for invalid input, `401` for missing
authentication, `403` for missing authority, `404` for an unknown or inactive
site, `429` for rate limiting, and `500` for server-side query failures.
