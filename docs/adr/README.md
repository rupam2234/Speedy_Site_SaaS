# Architecture Decision Records (ADRs) (`docs/adr/`)

This directory maintains immutable records of architectural and technical decisions made for **Speedy Site Saas**.

---

## 🗺️ Master Decision Log

| ADR # | Date | Title | Status | Chosen Option |
| :--- | :--- | :--- | :--- | :--- |
| **0001** | 2026-11-21 | [Initial System Architecture](0001-initial-architecture.md) | 🟢 Accepted | Standardized Modular Tiering |
| **0002** | 2026-11-21 | [Order-Scoped Communication Channels](0002-order-communication-channels.md) | 🟢 Accepted | Order-Scoped Dual-Channel Native Architecture |
| **0003** | 2026-11-23 | [Delayed Chat Email Notifications](0003-delayed-chat-email-notifications.md) | 🟢 Accepted | 15-Minute Grace Window with Supabase pg_cron Digest |
| **0004** | 2026-11-23 | [Compact RUM Telemetry and RAG Knowledge Model](0004-compact-rum-telemetry-and-rag-knowledge-model.md) | 🟢 Accepted | Canonical Pageview Facts, Bounded Evidence, and Derived RAG Documents |

---

## 📖 ADR Operating Guidelines

1. **Why Over How**: ADRs preserve *why* a technology, framework, or architectural pattern was chosen over alternatives to prevent circular debates. Step-by-step implementation tasks belong in `docs/plans/`.
2. **Immutability**: Once an ADR is marked `Accepted`, its historical text is never edited. If the decision changes, author a new ADR that explicitly marks the earlier one as `Superseded`.
3. **Numbering**: Files are strictly four-digit sequential: `NNNN-short-slug.md`.
