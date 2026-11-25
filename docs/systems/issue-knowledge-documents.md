# System: Issue Knowledge Documents

> **Status:** Approved implementation contract
> **Related ADRs:** [ADR-0004](../adr/0004-compact-rum-telemetry-and-rag-knowledge-model.md), [ADR-0007](../adr/0007-evidence-first-issue-diagnosis-and-grounded-remediation.md)
> **Related Plan:** [Evidence-First Issue Diagnosis and Grounded Remediation](../plans/2026-11-25_041449_evidence_first_issue_diagnosis_and_grounded_remediation.md)
> **Purpose:** Define stable, traceable issue documents as the authoritative diagnosis and workflow record before any vector indexing work.

---

## 1. Purpose

Issue knowledge documents convert repeated real-user evidence into an actionable WordPress diagnosis. They are the only records approved for embedding into Cloudflare Vectorize. Raw pageviews remain in Supabase and are never embedded.

A document represents one diagnosed issue family, not one visit. It must answer what happened, where it happened, which cohort is affected, why it is likely happening, what evidence supports the conclusion, and what WordPress fix an expert should consider.

## 2. Canonical document schema

```json
{
  "schema_version": 1,
  "tenant_id": "uuid",
  "site_id": "uuid",
  "domain_name": "example.com",
  "issue_type": "slow_lcp_image",
  "status": "active",
  "severity": "high",
  "confidence": 0.92,
  "title": "LCP is delayed by an oversized hero image",
  "symptom": "Poor LCP on mobile product pages",
  "root_cause": "The hero image is not compressed and has high render delay",
  "affected": {
    "page_template": "/products/*",
    "country": null,
    "region": null,
    "device_type": "mobile",
    "network_type": "4g"
  },
  "observation": {
    "period_start": "2026-11-01T00:00:00Z",
    "period_end": "2026-11-23T23:59:59Z",
    "sample_count": 42,
    "session_count": 31,
    "metrics": {
      "lcp_p75_ms": 4200,
      "ttfb_p75_ms": 1100,
      "cls_p75": 0.04
    }
  },
  "evidence": [],
  "recommended_fix": "Compress and resize the hero image, then preload the responsive source",
  "provenance": {
    "source_kind": "rum_issue_family",
    "source_ids": [],
    "generated_at": "2026-11-23T23:00:00Z"
  }
}
```

## 3. Field requirements

| Field | Requirement |
| :--- | :--- |
| `tenant_id`, `site_id` | Required and authoritative. The site must belong to the tenant. |
| `domain_name` | Required. It must match the site record. |
| `issue_type` | Required. It must be one of the supported issue types. |
| `status` | One of `active`, `resolved`, or `dismissed`. Only `active` documents are eligible for indexing. |
| `severity` | One of `low`, `medium`, or `high`. |
| `confidence` | Number from 0 to 1. |
| `title`, `symptom`, `root_cause` | Required plain text. The root cause must cite evidence or a confirmed backend test. |
| `affected` | At least a page template or site-wide scope. Cohort dimensions are nullable. |
| `observation.period_start`, `period_end` | Required UTC timestamps. The start must not be after the end. |
| `observation.sample_count` | Required positive integer. |
| `observation.session_count` | Required positive integer and must not exceed the sample count. |
| `observation.metrics` | Required for performance issues. It contains bounded aggregate metrics, not raw pageviews. |
| `evidence` | Required. It contains only the compact evidence needed to explain the issue. |
| `recommended_fix` | Required for actionable issue types. It must be specific enough for an expert to act. |
| `provenance.source_ids` | Required. It identifies the aggregate or source records used to create the document. |

### 3.1 Source fact null semantics

A null canonical telemetry value means the fact was not observed or is unavailable. It must not be interpreted as zero, a passing measurement, or evidence that the site is unaffected. Legacy pageviews remain valid sources, but a document may omit a dimension that was not available for those rows.

`referrer_domain` identifies an external traffic source when known. It may support traffic-context analysis, but it does not establish a performance cause. Internal navigation and legacy rows may have a null referrer domain.

## 4. Supported issue types

- `slow_lcp_image`
- `render_blocking_plugin_asset`
- `heavy_third_party_script`
- `slow_origin_response`
- `layout_instability`
- `poor_mobile_experience`
- `high_inp_interaction_cost`
- `failed_or_slow_resource`
- `client_error_pattern`

An issue type is added only with a documented detector, required evidence, minimum sample threshold, and recommended-fix format.

## 5. Sample and confidence thresholds

### 5.1 Minimum publication thresholds

| Scope | Pageview samples | Distinct sessions | Requirement |
| :--- | :--- | :--- | :--- |
| Site-wide issue | 20 | 10 | Required for publication. |
| Page-template issue | 10 | 5 | Required for publication. |
| Device or network cohort issue | 10 | 5 | The cohort must be materially worse than the site baseline. |
| Country or region cohort issue | 10 | 5 | At least 3 distinct regions in the site may be compared for context. |
| Individual asset or selector issue | 5 | 3 | The asset or selector must recur across samples. |
| Error-signature issue | 5 | 3 | The normalized signature must recur. |

A lower-threshold candidate may be retained as an internal diagnostic observation, but it must not be published as an issue document or indexed into Vectorize.

### 5.2 Confidence rules

| Confidence | Minimum requirement |
| :--- | :--- |
| High, 0.85 to 1.0 | Meets the publication threshold, repeats across the observation period, and has a supported cause or direct asset evidence. |
| Medium, 0.60 to 0.84 | Meets the publication threshold and has consistent symptom evidence, but the cause is probable rather than confirmed. |
| Low, below 0.60 | Does not meet publication thresholds or has conflicting evidence. It must not be indexed. |

Only documents with confidence of at least 0.60 and status `active` are eligible for the Vectorize exporter.

A confidence value describes the strength of the diagnosis, not the percentage of pageviews affected. Evidence supports a likely cause unless a backend test or direct asset evidence confirms it.

### 5.3 Material cohort rule

A cohort-specific issue is valid only when the cohort p75 for the affected metric is at least 25 percent worse than the site-wide p75 and the difference remains significant at the document's sample threshold. The document records both values when cohort scope is used.

## 6. Baked reason format

Every published issue contains a baked reason with this order:

1. **What:** the observed performance problem and affected metric.
2. **Where:** page template and material cohort.
3. **Evidence:** sample count, period, and the supporting metric or asset.
4. **Why:** the supported cause, with confidence language that matches the evidence.
5. **Fix:** the recommended WordPress or third-party remediation.

Example:

> Poor mobile LCP is concentrated on product pages. Across 42 mobile pageviews from 31 sessions, LCP p75 was 4.2 seconds, 37 percent above the site p75. The recurring hero image was 1.9 MB decoded and showed 1.6 seconds of load delay. Compress and resize the hero image, then preload the responsive source.

## 7. Detection and Workflow Boundary

ADR-0007 establishes deterministic detection as the only path that publishes an
issue. A detector aggregates canonical RUM facts and corroborated WordPress
backend tests into a stable issue fingerprint. The fingerprint includes site,
issue type, page template, target or asset, and material cohort. Publication
requires the thresholds in Section 5.

The issue workflow is:

```text
detected -> reviewed -> in_progress -> fixed -> verified -> resolved
```

`dismissed` is a separate terminal state and requires a reason. Issue documents
retain the bounded evidence needed to understand the diagnosis after raw
pageview retention expires. The service channel compares matching templates,
metrics, and cohorts across comparable windows before verifying a fix.

## 8. Retrieval Boundary

Only approved issue documents and curated remediation knowledge are eligible for
Cloudflare Vectorize indexing. Raw pageviews, contributor rows, raw RUM events,
raw backend logs, and unbounded plugin descriptions are excluded.

An authenticated request resolves tenant and site on the application server,
filters Vectorize by tenant namespace and site, retrieves a small candidate
set, then loads current issue documents and aggregates from Supabase before
generation. Retrieved text is untrusted reference material and cannot change
tool permissions, tenant scope, workflow state, or authoritative evidence.

The implemented customer flow lives in `src/app/api/rum/issues/[issueId]/assistant/route.ts`.
It loads one published issue from Supabase before calling the
`cloudflare-workers/issue-knowledge` Worker. The Worker uses Workers AI with
`@cf/baai/bge-small-en-v1.5` and the `speedy-issue-knowledge` Vectorize index.
Tenant namespaces isolate customer documents, the `siteId` metadata filter
restricts those documents to the authorized site, and curated playbooks use a
separate namespace. The model receives the current issue as authoritative
facts and retrieved material only as untrusted reference.

The implementation plan is
`docs/plans/2026-11-25_041449_evidence_first_issue_diagnosis_and_grounded_remediation.md`.
