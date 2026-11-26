# Development Plans & Milestone Roadmap (`docs/plans/`)

This directory serves as the structured development roadmap and chronological milestone tracking repository for **Speedy Site Saas**.

---

## 🗺️ Master Phase Roadmap & Live Status

| Created | Plan Document | Status | Description |
| :--- | :--- | :--- | :--- |
| 2026-10-10 | [`2026-10-10_000000_restructure_plan.md`](2026-10-10_000000_restructure_plan.md) | 🟢 **COMPLETED** | Historical umbrella roadmap for the Speedy Site refocus; delivery continues under successor ADRs and plans. |
| 2026-11-21 | [`2026-11-21_192616_00_initial_architecture_setup.md`](2026-11-21_192616_00_initial_architecture_setup.md) | 🟢 **COMPLETED** | Phase 0: Initial Architecture & Baseline Setup (6/6 tasks). |
| 2026-11-21 | [`2026-11-21_205705_order_communication_channels.md`](2026-11-21_205705_order_communication_channels.md) | 🟢 **COMPLETED** | Plan: Order Communication Channels (Customer-Expert with Admin Oversight) (26/26 tasks). |
| 2026-11-23 | [`2026-11-23_120259_delayed_chat_email_notifications.md`](2026-11-23_120259_delayed_chat_email_notifications.md) | 🟢 **COMPLETED** | Delayed Chat Email Notifications (15-Minute Grace Window & Digest) (20/20 tasks). |
| 2026-11-23 | [`2026-11-23_223431_compact_rum_telemetry_and_rag_readiness.md`](2026-11-23_223431_compact_rum_telemetry_and_rag_readiness.md) | 🟢 **COMPLETED** | Compact RUM telemetry and reader migration complete; issue detection and RAG scope transferred to the evidence-first issue plan. |
| 2026-11-24 | [`2026-11-24_054436_focused_rum_dashboard_and_data_retirement.md`](2026-11-24_054436_focused_rum_dashboard_and_data_retirement.md) | 🟡 **IN PROGRESS** | Dashboard and reader retirement complete; traffic-cycle parity and separately approved destructive `events` removal remain. |
| 2026-11-25 | [`2026-11-25_022436_rum_hot_cold_history_retention.md`](2026-11-25_022436_rum_hot_cold_history_retention.md) | 🔴 **PLANNED** | RUM hot and cold history retention; security and storage recovery complete, snapshot schema and reader pending. |
| 2026-11-25 | [`2026-11-25_041449_evidence_first_issue_diagnosis_and_grounded_remediation.md`](2026-11-25_041449_evidence_first_issue_diagnosis_and_grounded_remediation.md) | 🟡 **IN PROGRESS** | Secure RUM boundary, issue schema, LCP v1 detector, issue APIs, issue-first Web Vitals panel, customer issue assistant, and tenant-scoped Cloudflare RAG pilot implemented. Other detectors, backend correlation, workflow actions, evaluations, and rollout remain. |
| 2026-11-26 | [`2026-11-26_073024_universal_device_issue_panels.md`](2026-11-26_073024_universal_device_issue_panels.md) | 🟢 **COMPLETED** | Universal desktop, mobile, and tablet issue panels with asset marking replace the per-metric affected-elements switch (ADR-0008). |
| 2026-11-26 | [`2026-11-26_120026_site_wide_rag_performance_assistant.md`](2026-11-26_120026_site_wide_rag_performance_assistant.md) | 🟢 **COMPLETED** | Site-wide RAG assistant page with server-derived structured context, multi-layer caching, and a lower retrieval window (ADR-0009). |
| 2026-11-26 | [`2026-11-26_135353_device_level_lcp_verdict_reader.md`](2026-11-26_135353_device_level_lcp_verdict_reader.md) | 🟢 **COMPLETED** | Device-level LCP verdict reader so a device with mostly poor LCP is no longer reported as healthy (ADR-0010). |

Historical plan files remain in this directory as the chronological implementation record. A plan marked completed may retain unchecked historical tasks when that scope was explicitly transferred to a successor plan.


---

## 1. Developmental History & Chronological Tracking

Every plan file in `docs/plans/` represents a discrete, reviewable engineering phase or architectural overhaul.
To preserve a transparent and audit-proof developmental history:
- **Timestamp Prefix**: Every plan file is prefixed with the exact ISO/compact timestamp when it was authored (e.g. `YYYY-MM-DD_HHMMSS_<slug>.md`).
- **Ordered Evolution**: Chronological sorting directly reconstructs the evolution and progression of the codebase over time.

---

## 2. Standard Plan Document Structure

Each plan document must maintain:
1. **Header Metadata**:
   - Status: `🔴 INCOMPLETE / PLANNED` | `🟡 IN PROGRESS` | `🟢 COMPLETED`
   - Created & Updated timestamps
   - Target source files and prerequisite phases
2. **Interactive Objective Checklist**: Checked off as milestones are achieved (`- [ ]` -> `- [x]`).
3. **Architecture & Flows**: Visual diagrams explaining the subsystem interactions.
4. **Verification Gate**: Concrete commands to prove the milestone is complete.
