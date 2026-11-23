# ADR-0003: Delayed Chat Email Notifications (15-Minute Grace Window & Unread Digest)

> **Status:** Accepted  
> **Date:** 2026-11-23  
> **Decision-Makers:** Core Engineering Team  
> **Supersedes:** None  
> **Superseded By:** None  

---

## 1. Context & Problem Statement

In ADR-0002, order-scoped communication channels were established between customers, assigned experts, and platform administrators. The initial notification pipeline dispatched both an in-app notification row (`public.notifications`) and an external email via Resend immediately upon every message creation.

During active back-and-forth communication, participants are already focused on their screens. Immediate email dispatch generated high inbox noise, sending dozens of redundant notification emails for messages that participants had already read in the browser within seconds.

The platform requires an email notification delivery strategy that:
1. Keeps in-app UI notifications and Supabase Realtime alerts immediate for online participants.
2. Suppresses external emails if the recipient reads the message in the browser within a reasonable grace window.
3. Consolidates multiple unread messages from the same conversation into a single email digest.
4. Prevents duplicate notifications using idempotent database tracking.

---

## 2. Decision Drivers

- **User Experience**: Drastically reduce email clutter during live interactive conversations.
- **Delivery Reliability**: Ensure genuinely unattended messages reliably trigger external email alerts.
- **Operational Efficiency & Cost**: Consolidate multiple unread messages into a single Resend API dispatch.
- **Architectural Cohesion**: Rely on native database scheduling (`pg_cron`) rather than deprecated Cloudflare cron triggers or tier-restricted Vercel Cron.

---

## 3. Considered Alternatives

### Alternative A: Immediate Email with Application-Tier In-Memory Debounce
- **Pros:** No scheduled background cron required.
- **Cons:** Serverless functions are ephemeral and stateless; in-memory timers do not survive across function lifecycles or cold starts. Redis-based delayed queues (e.g. BullMQ) require standing long-running worker processes not currently in our Next.js edge stack.

### Alternative B: Edge Worker Cron (Cloudflare Workers / Vercel Cron)
- **Pros:** External HTTP invocation on a schedule.
- **Cons:** Cloudflare Worker cron jobs are being phased out in our migration architecture. Vercel Cron has restrictive execution limits on Hobby tier plans.

### Alternative C: Native Supabase `pg_cron` + `pg_net` with API Digest Endpoint (Chosen)
- **Pros:** Runs directly inside Supabase Postgres where messages live. Executes on a regular schedule (every 5 minutes) without maintaining standing external daemon infrastructure. Leverages partial Postgres indexing for zero-overhead scans.
- **Cons:** Requires enabling `pg_cron` and `pg_net` extensions and setting internal service configuration variables.

---

## 4. Decision Outcome

**Chosen Option:** 15-Minute Grace Window with Supabase `pg_cron` and Consolidated Digest Dispatch.

### Specifications:

1. **Immediate vs Delayed Notification Separation**:
   - In-app bell notifications (`public.notifications`) and Supabase Realtime remain immediate upon message creation.
   - Message creation endpoints (`POST /api/chat/messages`) do not dispatch outbound emails.

2. **Schema & Indexing**:
   - `public.order_messages` includes an `email_notified_at timestamptz NULL` column.
   - Partial composite index `idx_order_messages_unnotified_unread` on `(conversation_id, created_at) WHERE read_at IS NULL AND email_notified_at IS NULL`.
   - Partial index `idx_order_messages_cron_digest` on `(created_at) WHERE read_at IS NULL AND email_notified_at IS NULL`.

3. **Scheduler**:
   - Supabase `pg_cron` runs every 5 minutes invoking `POST /api/cron/chat-notifications` via `pg_net` with a Bearer authentication token.

4. **15-Minute Grace Evaluation**:
   - Messages viewed within 15 minutes set `read_at = now()`. The cron scan ignores any message where `read_at IS NOT NULL` (zero emails sent).
   - Messages unread after 15 minutes (`read_at IS NULL AND email_notified_at IS NULL AND created_at <= now() - interval '15 minutes'`) are batched by recipient and conversation.

5. **Consolidated Digest & Idempotency**:
   - Multiple unread messages for a recipient within the same conversation are compiled into a single responsive HTML email digest.
   - Upon successful Resend dispatch, all included message IDs are stamped with `email_notified_at = now()`, preventing duplicate email delivery.

---

## 5. Consequences & Trade-offs

### Positive:
- Zero inbox spam during live interactive chat sessions.
- Consolidated digest gives offline recipients complete conversation context with one click.
- Completely idempotent and resilient against server restarts or network retries.
- Reduces outbound email volume and Resend quota usage.

### Negative / Mitigations:
- Recipients who are genuinely away from their keyboard experience a 15-minute latency before receiving an email alert. Mitigated by immediate in-app bell notifications remaining active for any device with the site open.
- Database must maintain `pg_cron` and `pg_net` extensions. Handled cleanly in migrations with fallback exception handling.
