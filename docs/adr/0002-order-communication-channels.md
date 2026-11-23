# ADR-0002: Order-Scoped Communication Channels with Role-Gated Access

> **Status:** Accepted  
> **Date:** 2026-11-21  
> **Decision-Makers:** Core Engineering Team  
> **Supersedes:** None  
> **Superseded By:** None  

---

## 1. Context & Problem Statement

Speedy Site delivers managed WordPress optimization services where customers interact directly with assigned performance experts. The platform requires a structured communication mechanism satisfying specific operational constraints:
1. Communication must be scoped strictly to an order and its associated website.
2. The customer and assigned expert must communicate directly in real time.
3. Platform administrators must have read-only visibility into the customer-expert communication for quality assurance and compliance without being able to intervene or send messages directly to the customer in that thread.
4. Administrators must have an isolated channel to message the assigned expert directly regarding the order without customer visibility.

---

## 2. Decision Drivers

- **Security & Authorization**: Database-enforced Row Level Security (RLS) preventing unauthorized access, message spoofing, or cross-order message leaks.
- **Role Isolation**: Strict separation between public client-facing dialogue and private staff notes/instructions.
- **Operational Simplicity**: Leverage existing Supabase Postgres, Auth, and Realtime infrastructure rather than maintaining external third-party chat platforms.
- **Auditability**: Complete chronological record of messages and internal admin-expert consultations tied to order history.

---

## 3. Considered Alternatives

### Alternative A: Third-Party Chat Platform (Chatwoot, Rocket.Chat, Zulip)
- **Pros:** Pre-built agent inboxes, canned responses, mobile apps.
- **Cons:** High operational and hosting overhead, duplicated authentication and user identities, complex synchronization with order lifecycle, difficult to enforce the custom admin read-only plus private expert backchannel model.

### Alternative B: Generic 1:1 User-to-Expert DMs
- **Pros:** Simpler two-party schema (`user_id`, `expert_id`).
- **Cons:** Lacks order context when a customer has multiple websites or recurring orders. Cannot cleanly separate admin supervision from customer messages.

### Alternative C: Order-Scoped Dual-Channel Native Architecture (Chosen)
- **Pros:** Tight integration with `orders` and `order_assignments`. Explicit separation of `client` and `internal` channels per order. Supabase Realtime delivers instant messages while RLS guarantees security. Zero external chat server dependencies.
- **Cons:** Chat UI components and notification aggregation must be maintained within the Next.js frontend.

---

## 4. Decision Outcome

**Chosen Option:** Order-Scoped Dual-Channel Native Architecture built on Supabase Postgres, Realtime, and Next.js.

### Architecture Specifications:

1. **Entity Hierarchy**:
   * Every order creates or links to two distinct conversation channels:
     * `client`: Customer <-> Assigned Expert.
     * `internal`: Admin <-> Assigned Expert.
2. **Permission Matrix**:
   * **Client Channel**:
     * Customer: Read, Write.
     * Assigned Expert: Read, Write.
     * Admin: Read-Only (enforced by RLS policy blocking `INSERT` by admin users).
   * **Internal Channel**:
     * Admin: Read, Write.
     * Assigned Expert: Read, Write.
     * Customer: No access (invisible in queries and Realtime subscriptions).
3. **Realtime & Delivery**:
   * Supabase Realtime broadcast and Postgres changes gated by RLS.
   * Asynchronous notification alerts handled via Resend when recipients are offline or messages remain unread after a set grace window.

---

## 5. Consequences & Trade-offs

### Positive:
- Granular, tamper-proof access control enforced at the database layer.
- Clean separation between customer service communication and administrative oversight.
- Native re-use of Supabase Auth, profiles, and order assignment data models.

### Negative / Mitigations:
- Frontend must implement responsive chat interface components tailored for both desktop and mobile viewports.
- Notification dispatch requires debounce logic to prevent inbox flooding when active conversations take place.

---

## 6. Links & Related Documents
- Target Implementation Plan: `docs/plans/2026-11-21_205700_order_communication_channels.md`
- Systems Dossier: `docs/systems/admin-expert-management.md`
- Systems Dossier: `docs/systems/managed-wp-order-assignment.md`
