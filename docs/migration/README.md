## Migration Overview

This directory contains a step‑by‑step breakdown of the migration from the old Subscription model to the new Service model. The original master checklist was split into three logical phases:

1. **Phase 1 – Database** – schema changes, data migration, type updates, and production‑ready snapshots.
2. **Phase 2 – Cloudflare Workers** – retiring old KV‑based workers and refactoring validation logic.
3. **Phase 3 – API Routes** – new unified checkout, webhook handling, and eliminating legacy endpoints.

Each phase file lists completed items, the remaining tasks, and important notes regarding telemetry, feature flags, and snapshot tags.

*Use the tag names (`migration‑<step>`) from the checkpoint sections for roll‑back or rollback guidance.*

---

| Phase | Completed | Pending | Tags |
|-------|----------|---------|------|
| 1 | ✅ | ⁉️ | `migration-db-v1`, `migration-db-prod-v1` |
| 2 | ✅ | ⁉️ | `migration-workers-subkv-deleted`, `migration-event-buffer-refactored` |
| 3 | ✅ | ⁉️ | `migration-checkout-new`, `migration-webhook-new`, `migration-old-apis-deleted` |

---

For detailed step‑by‑step instructions, see the respective `phaseX.md` files.