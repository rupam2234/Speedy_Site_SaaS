# Development Plans & Milestone Roadmap (`docs/plans/`)

This directory serves as the structured development roadmap and chronological milestone tracking repository for **Speedy Site Saas**.

---

## 🗺️ Master Phase Roadmap & Live Status

| Created | Plan Document | Status | Description |
| :--- | :--- | :--- | :--- |
| 2026-10-10 | [`2026-10-10_000000_restructure_plan.md`](file:///home/victor/Projects/Speedy_Site_SaaS/docs/plans/2026-10-10_000000_restructure_plan.md) | 🟡 **IN PROGRESS** | Restructure Plan: Reshaping speedy.site |
| 2026-11-21 | [`2026-11-21_192616_00_initial_architecture_setup.md`](file:///home/victor/Projects/Speedy_Site_SaaS/docs/plans/2026-11-21_192616_00_initial_architecture_setup.md) | 🟢 **COMPLETED** | Phase 0: Initial Architecture & Baseline Setup (6/6 tasks) |
| 2026-11-21 | [`2026-11-21_205705_order_communication_channels.md`](file:///home/victor/Projects/Speedy_Site_SaaS/docs/plans/2026-11-21_205705_order_communication_channels.md) | 🟢 **COMPLETED** | Plan: Order Communication Channels (Customer-Expert with Admin Oversight) (26/26 tasks) |
| 2026-11-23 | [`2026-11-23_120259_delayed_chat_email_notifications.md`](file:///home/victor/Projects/Speedy_Site_SaaS/docs/plans/2026-11-23_120259_delayed_chat_email_notifications.md) | 🟢 **COMPLETED** | Delayed Chat Email Notifications (15-Minute Grace Window & Digest) (20/20 tasks) |
| 2026-11-23 | [`2026-11-23_223431_compact_rum_telemetry_and_rag_readiness.md`](2026-11-23_223431_compact_rum_telemetry_and_rag_readiness.md) | 🟡 **IN PROGRESS** | Compact RUM Telemetry and RAG Readiness (compact v2 deployed and production-verified; reader migration, RAG, and production-scale baseline remain) |



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
