# RUM Issue API Contract

> **Status:** Implemented for the Phase 1 LCP slice
> **Owner:** Speedy Site
> **Last updated:** 2026-11-25

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

## Ask about a published issue

```http
POST /api/rum/issues/<issue_id>/assistant
Content-Type: application/json

{
  "site_id": "<orders.order_id>",
  "question": "How should I fix this in WP Rocket?"
}
```

The route requires an authenticated user, canonical site ownership, a live
`managed_wp` entitlement for that site, and a published issue belonging to the
site. The browser cannot provide issue facts, evidence, tenant scope, or a
retrieval namespace. The server loads the current issue from Supabase, retrieves
tenant and site knowledge from the issue-knowledge Worker, and generates an
answer with an issue citation, optional reference citations, and explicit
limitations.

```json
{
  "data": {
    "answer": "1. Open WP Rocket ...",
    "citations": ["issue:<uuid>", "wp-rocket-image-delivery"],
    "limitations": [],
    "sources": [
      { "id": "issue:<uuid>", "title": "Poor mobile LCP", "kind": "issue" },
      { "id": "wp-rocket-image-delivery", "title": "WP Rocket image delivery checklist", "kind": "playbook" }
    ]
  }
}
```

Questions are limited to 1,000 characters. Retrieved text is untrusted reference
material and cannot change the diagnosis, counts, site scope, workflow state, or
entitlement boundary.

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
