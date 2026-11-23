# Implementation Plan & Specification: Onboarding & Expert Assignment System

> **Status:** Completed & Verified  
> **Merged Base:** `remotes/origin/onbording` integrated into `feature/admin-wiring`  
> **Target Branch:** `feature/admin-wiring`  
> **Last Updated:** 2026-11-11  

---

## 1. Context & Architectural Reconciliation

With `remotes/origin/onbording` merged, the codebase now relies on the consolidated `public.orders` model where customer setup tour state is tracked inline (`setup_step`, `tour`, `setup_completed_at`) via migration `20261108000001_setup_on_orders_no_free_tier.sql`.

To ensure total backwards compatibility with external webhooks and triggers that may send payloads styled after either `public.site_onboarding` or `public.orders`, the ingestion and assignment layers support both formats interchangeably (`onboarding_id` / `order_id`, `site_name` / `website_name`).

---

## 2. Implementation Specifications

### Item 1: Admin New Onboarding Webhook (`/webhook/admin/new_onboarding`)
- **Endpoints**:
  - `src/app/webhook/admin/new_onboarding/route.ts`
  - `src/app/api/webhook/admin/new_onboarding/route.ts` (route alias for standard Next.js API consumers)
- **Responsibility**:
  - Strictly reports/notifies admins of new signups/onboardings (decoupled from auto-assignment).
- **Security & Validation**:
  - Validates `x-webhook-secret` or `Authorization: Bearer <token>` against `ADMIN_WEBHOOK_SECRET` / `CRON_SECRET_TOKEN`.
- **Payload Contract**:
  ```typescript
  interface NewOnboardingWebhookPayload {
    onboarding_id?: string;
    order_id?: string;
    user_id: string;
    user_email?: string;
    site_name?: string;
    website_name?: string;
    created_at?: string;
  }
  ```
- **Async Execution & Fast ACK**:
  - Returns HTTP `200 OK` `{ received: true }` immediately to prevent webhook caller timeouts.
  - Schedules background dispatch via `after()` solely for the admin alert email.
- **Admin Alert Email**:
  - Sent via Resend to admin distribution (`thespeedysite@gmail.com`).
  - Contains customer details, website name, and direct triage link to `/dashboard/queue`.

---

### Item 2: Automated Expert Assignment Engine
- **Engine Service**: `src/lib/services/assignmentService.ts` (re-exported via `src/lib/services/assignmentEngine.ts`)
- **Eligibility & Algorithm**:
  - Filter: `is_available = true` and `active_load < capacity` in `public.experts_pool`.
  - Ranking (migration `20261111000002_utilization_pick_next_expert.sql`): utilization ratio `(active_load::numeric / GREATEST(capacity, 1)) ASC`, then `active_load ASC`, `last_assigned_at ASC NULLS FIRST`, `rr_position ASC`.
  - Concurrency Safety: Invokes PostgreSQL function `public.pick_next_expert()` which utilizes `FOR UPDATE OF e SKIP LOCKED` to prevent race conditions.
- **Atomic Assignment Execution**:
  - Creates/updates active record in `public.order_assignments` (`status: 'pending'`, `is_active: true`, `assigned_by: null`).
  - Increments `rr_position` and sets `last_assigned_at = NOW()`.
- **Fallback**:
  - When no expert is free or all are at capacity, the order remains unassigned in `/dashboard/queue` with SLA countdown.

---

### Item 3: Admin Auto-Assignment Toggle
- **Database Storage**:
  - Migration `supabase/migrations/20261111000001_system_settings.sql`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.system_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        updated_by uuid REFERENCES auth.users(id)
    );
    ```
  - Initial seed: `key = 'auto_assignment_enabled'`, `value = '{"enabled": true}'::jsonb`.
- **Admin Configuration API**:
  - `GET /api/admin/settings/auto-assignment`: gated with `requireRole(["admin"])`; returns `{ enabled: boolean, updatedAt: string }`.
  - `PATCH /api/admin/settings/auto-assignment`: gated with `requireRole(["admin"])`. Body `{ enabled: boolean }`.
- **Workflow Gate**:
  - Checked in a separate background `after()` task during order ingestion (`POST /api/orders/newOrder` -> `runAutoAssignmentIfEnabled`):
    - If `true` -> runs automated assignment engine.
    - If `false` -> leaves order in unassigned queue for manual triage.
- **UI Integration**:
  - Toggle switch component mounted in `/dashboard/admin/queue` and `/dashboard/admin/experts` with instant state update and Sonner toasts.

---

### Item 4: Admin Manual Work Assignment
- **API Endpoint**: `POST /api/admin/assignments`
  - Body:
    ```typescript
    interface ManualAssignmentRequest {
      onboarding_id?: string;
      order_id?: string;
      orderId?: string;
      expert_id?: string;
      expertId?: string;
      notes?: string;
    }
    ```
- **Validation**:
  - Gated with `requireRole(["admin"])`.
  - Validates order existence in `public.orders`.
  - Validates expert eligibility and availability in `public.experts_pool`.
- **State Update**:
  - Inserts new active assignment in `public.order_assignments` with `assigned_by = admin_id` and `status = 'pending'`.
  - Updates expert's `last_assigned_at = NOW()`.
  - Triggers unified assignment notification dispatch.

---

### Item 5: Expert Assignment Email Notification
- **Centralized Dispatcher**: `src/lib/services/dispatchAssignment.ts`
  - Invoked uniformly by automated engine (Item 2) and manual assignment (Item 4).
- **Expert Email Notification**:
  - Sent via Resend (`src/app/api/emails/expertAssignment.ts`).
  - Contains site domain, customer reference, 24h SLA target, and direct link to `/dashboard/orders`.
- **In-App Notification**:
  - Inserts row in `public.notifications` for the assigned expert.

---

### Item 6: Cross-Portal Consistency Guard
- **Header Isolation**:
  - Update `src/components/sidebarDesign/Inset-Header.tsx`: ensure customer setup indicator (`Setup status` / `Connected`) is only visible for `role === "user"`. Admin and expert headers remain clean without extraneous onboarding CTAs.

---

## 3. Checklist of Files to Create / Modify

- [x] `supabase/migrations/20261111000001_system_settings.sql` (New table & default setting)
- [x] `supabase/migrations/20261111000002_utilization_pick_next_expert.sql` (Utilization-ratio `pick_next_expert()`)
- [x] `src/lib/services/assignmentService.ts` (Assignment engine, settings reader/writer, notification dispatcher)
- [x] `src/app/api/emails/expertAssignment.ts` (Resend email template for assigned experts)
- [x] `src/app/api/emails/adminNewOnboarding.ts` (Resend email template for admin intake alert)
- [x] `src/app/webhook/admin/new_onboarding/route.ts` & `src/app/api/webhook/admin/new_onboarding/route.ts` (Webhook routes)
- [x] `src/app/api/orders/newOrder/route.ts` (Separate `after()` auto-assignment gate on order ingestion)
- [x] `src/app/api/admin/settings/auto-assignment/route.ts` (Settings GET/PATCH)
- [x] `src/app/api/admin/assignments/route.ts` (Manual assignment route)
- [x] `src/app/(dashboard)/dashboard/admin/queue/page.tsx` & `src/app/(dashboard)/dashboard/admin/experts/page.tsx` (Auto-Assignment Toggle UI)
- [x] `src/components/sidebarDesign/Inset-Header.tsx` (Role-guard setup indicator)
- [x] `tests/onboarding-assignment.test.mjs` (Automated verification suite via `npm test`)

---

## 4. Verification & Validation Steps

1. `npx tsc --noEmit` — Zero TypeScript compilation errors.
2. `npm run lint` — Linting pass.
3. Unit verification:
   - Webhook accepts simulated POST request with valid secret and returns 200.
   - Setting toggle correctly toggles boolean state in `system_settings`.
   - Manual assignment endpoint updates assignment table and calls dispatch notification.
   - Header renders cleanly across user, admin, and expert viewports.
