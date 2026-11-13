import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Env must be set before importing route/db modules (singleton client reads once)
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://mock.supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
process.env.RESEND_API_KEY = "re_test_mock_key";
process.env.NEXT_PUBLIC_PROD_BASE_URL = "https://speedy.site";

const { NextRequest } = await import("next/server");

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const EXPERT_1 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const EXPERT_2 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02";

function makeSessionCookie(userId) {
  const jwt =
    "eyJhbGciOiJIUzI1NiJ9." +
    Buffer.from(JSON.stringify({ sub: userId, exp: 9999999999 })).toString("base64url") +
    ".sig";
  return (
    "base64-" +
    Buffer.from(
      JSON.stringify({
        access_token: jwt,
        refresh_token: "refresh",
        expires_at: 9999999999,
        expires_in: 3600,
        token_type: "bearer",
        user: { id: userId },
      }),
    ).toString("base64url")
  );
}

function setAuthUser(userId) {
  const map = new Map();
  if (userId) {
    map.set("sb-mock-auth-token", makeSessionCookie(userId));
  }
  globalThis.__TEST_COOKIES__ = map;
}

function createMockBackend() {
  const db = {
    profiles: [
      { id: ADMIN_ID, email: "admin@example.com", role: "admin" },
      { id: USER_ID, email: "customer@example.com", role: "user" },
      { id: EXPERT_1, email: "expert1@example.com", role: "expert" },
      { id: EXPERT_2, email: "expert2@example.com", role: "expert" },
    ],
    system_settings: [
      {
        key: "auto_assignment_enabled",
        value: { enabled: true },
        updated_at: "2026-11-11T00:00:00.000Z",
        updated_by: null,
      },
    ],
    user_services: [
      {
        id: "svc-1",
        user_id: USER_ID,
        service_type: "managed_wp",
        status: "active",
        metadata: { site_limit: 1 },
        order_id: null,
        website_name: null,
      },
    ],
    orders: [],
    experts_pool: [
      {
        expert_id: EXPERT_1,
        capacity: 10,
        is_available: true,
        rr_position: 0,
        last_assigned_at: null,
      },
      {
        expert_id: EXPERT_2,
        capacity: 5,
        is_available: true,
        rr_position: 0,
        last_assigned_at: null,
      },
    ],
    order_assignments: [],
    notifications: [],
  };

  const sentEmails = [];
  const restCalls = [];
  let rpcCount = 0;

  function applyFilters(rows, params) {
    return rows.filter((row) => {
      for (const [k, v] of params.entries()) {
        if (k === "select" || k === "on_conflict") continue;
        if (v.startsWith("eq.")) {
          const expected = v.slice(3);
          const actual = row[k];
          if (expected === "true") {
            if (actual !== true) return false;
          } else if (expected === "false") {
            if (actual !== false) return false;
          } else if (String(actual) !== expected) {
            return false;
          }
        }
      }
      return true;
    });
  }

  function pickNextExpertByUtilization() {
    const eligible = db.experts_pool
      .filter((e) => e.is_available)
      .map((e) => {
        const activeLoad = db.order_assignments.filter(
          (a) =>
            a.expert_id === e.expert_id &&
            a.is_active &&
            ["pending", "accepted", "in_progress"].includes(a.status),
        ).length;
        return { ...e, activeLoad };
      })
      .filter((e) => e.activeLoad < e.capacity)
      .sort((a, b) => {
        const ratioDiff = a.activeLoad / a.capacity - b.activeLoad / b.capacity;
        if (ratioDiff !== 0) return ratioDiff;
        if (a.activeLoad !== b.activeLoad) return a.activeLoad - b.activeLoad;
        if (a.last_assigned_at !== b.last_assigned_at) {
          if (a.last_assigned_at === null) return -1;
          if (b.last_assigned_at === null) return 1;
          return a.last_assigned_at.localeCompare(b.last_assigned_at);
        }
        return a.rr_position - b.rr_position;
      });

    if (eligible.length === 0) return null;
    const chosen = db.experts_pool.find((e) => e.expert_id === eligible[0].expert_id);
    chosen.rr_position += 1;
    chosen.last_assigned_at = new Date().toISOString();
    return chosen.expert_id;
  }

  async function mockFetch(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method || "GET").toUpperCase();
    const headers = new Headers(init.headers);

    // Resend outbound emails
    if (url.hostname === "api.resend.com" && url.pathname === "/emails") {
      const body = init.body ? JSON.parse(init.body) : {};
      sentEmails.push(body);
      return new Response(JSON.stringify({ id: `email_${sentEmails.length}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Supabase Auth
    if (url.hostname === "mock.supabase.local" && url.pathname === "/auth/v1/user") {
      const auth = headers.get("authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "");
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      const profile = db.profiles.find((p) => p.id === payload.sub);
      if (!profile) {
        return new Response(JSON.stringify({ message: "User not found" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ id: profile.id, email: profile.email }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Supabase RPC
    if (url.hostname === "mock.supabase.local" && url.pathname === "/rest/v1/rpc/pick_next_expert") {
      rpcCount += 1;
      restCalls.push({ method, path: url.pathname });
      const chosen = pickNextExpertByUtilization();
      return new Response(JSON.stringify(chosen), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Supabase REST tables
    if (url.hostname === "mock.supabase.local" && url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.replace("/rest/v1/", "");
      restCalls.push({ method, path: url.pathname });
      const rows = db[table];
      if (!rows) {
        return new Response(JSON.stringify({ message: `Unknown table ${table}` }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      const wantSingle = headers.get("accept") === "application/vnd.pgrst.object+json";

      if (method === "GET") {
        const filtered = applyFilters(rows, url.searchParams);
        if (wantSingle) {
          if (filtered.length !== 1) {
            return new Response(JSON.stringify({ message: "Row count != 1" }), {
              status: 406,
              headers: { "content-type": "application/json" },
            });
          }
          return new Response(JSON.stringify(filtered[0]), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify(filtered), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const body = init.body ? JSON.parse(init.body) : {};

      if (method === "POST") {
        const items = Array.isArray(body) ? body : [body];
        const prefer = headers.get("prefer") || "";
        const isUpsert = prefer.includes("resolution=merge-duplicates");
        const onConflict = url.searchParams.get("on_conflict");
        const inserted = [];

        for (const item of items) {
          const rec = { ...item };
          if (table === "orders" && !rec.order_id) {
            rec.order_id = `ord-${db.orders.length + 1}`;
            rec.order_date = rec.order_date || new Date().toISOString();
          }
          if (table === "order_assignments") {
            rec.id = rec.id || `asn-${db.order_assignments.length + 1}`;
            rec.is_active = rec.is_active ?? true;
            rec.status = rec.status ?? "pending";
            rec.assigned_at = rec.assigned_at || new Date().toISOString();
          }
          if (table === "notifications" && !rec.id) {
            rec.id = `notif-${db.notifications.length + 1}`;
          }

          if (isUpsert && onConflict) {
            const existingIdx = rows.findIndex((r) => r[onConflict] === rec[onConflict]);
            if (existingIdx >= 0) {
              rows[existingIdx] = { ...rows[existingIdx], ...rec };
              inserted.push(rows[existingIdx]);
              continue;
            }
          }
          rows.push(rec);
          inserted.push(rec);
        }

        const out = wantSingle ? inserted[0] : inserted;
        return new Response(JSON.stringify(out), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "PATCH") {
        const matched = applyFilters(rows, url.searchParams);
        for (const row of matched) {
          Object.assign(row, body);
        }
        const out = wantSingle ? matched[0] : matched;
        return new Response(JSON.stringify(out), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }

    throw new Error(`Unexpected outbound fetch in test: ${method} ${url.toString()}`);
  }

  return {
    db,
    sentEmails,
    restCalls,
    getRpcCount: () => rpcCount,
    mockFetch,
  };
}

async function flushAfter() {
  const queue = globalThis.__TEST_AFTER_QUEUE__;
  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    await Promise.all(batch);
  }
}

const webhookDirect = await import("@/app/webhook/admin/new_onboarding/route");
const webhookAlias = await import("@/app/api/webhook/admin/new_onboarding/route");
const settingsRoute = await import("@/app/api/admin/settings/auto-assignment/route");
const assignmentsRoute = await import("@/app/api/admin/assignments/route");
const newOrderRoute = await import("@/app/api/orders/newOrder/route");
const assignmentEngine = await import("@/lib/services/assignmentEngine");
const { default: SidebarInsetHeader } = await import("@/components/sidebarDesign/Inset-Header");

describe("Onboarding & Expert Assignment System", () => {
  let backend;
  let originalFetch;

  beforeEach(() => {
    backend = createMockBackend();
    originalFetch = globalThis.fetch;
    globalThis.fetch = backend.mockFetch;
    globalThis.__TEST_AFTER_QUEUE__ = [];
    setAuthUser(null);
    process.env.ADMIN_WEBHOOK_SECRET = "admin-secret-123";
    process.env.CRON_SECRET_TOKEN = "cron-secret-456";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete globalThis.__TEST_UI_MOCKS__;
    delete globalThis.__TEST_AFTER_QUEUE__;
    delete globalThis.__TEST_COOKIES__;
  });

  describe("Item 1: Admin New Onboarding Webhook (admin report only)", () => {
    it("rejects unauthorized or invalid payloads and accepts valid secrets on both routes", async () => {
      // Fail closed when env secrets are unset
      delete process.env.ADMIN_WEBHOOK_SECRET;
      delete process.env.CRON_SECRET_TOKEN;
      const unsetRes = await webhookDirect.POST(
        new NextRequest("http://localhost/webhook/admin/new_onboarding", {
          method: "POST",
          headers: { "x-webhook-secret": "anything" },
          body: JSON.stringify({ user_id: USER_ID }),
        }),
      );
      assert.equal(unsetRes.status, 401);

      process.env.ADMIN_WEBHOOK_SECRET = "admin-secret-123";
      process.env.CRON_SECRET_TOKEN = "cron-secret-456";

      const noAuthReq = new NextRequest("http://localhost/webhook/admin/new_onboarding", {
        method: "POST",
        body: JSON.stringify({ user_id: USER_ID }),
      });
      const noAuthRes = await webhookDirect.POST(noAuthReq);
      assert.equal(noAuthRes.status, 401);

      const missingUserReq = new NextRequest("http://localhost/webhook/admin/new_onboarding", {
        method: "POST",
        headers: { "x-webhook-secret": "admin-secret-123" },
        body: JSON.stringify({ site_name: "example.com" }),
      });
      const missingUserRes = await webhookDirect.POST(missingUserReq);
      assert.equal(missingUserRes.status, 400);

      // Direct route with x-webhook-secret
      const directRes = await webhookDirect.POST(
        new NextRequest("http://localhost/webhook/admin/new_onboarding", {
          method: "POST",
          headers: { "x-webhook-secret": "admin-secret-123" },
          body: JSON.stringify({
            order_id: "ord-100",
            user_id: USER_ID,
            user_email: "customer@example.com",
            website_name: "directsite.com",
          }),
        }),
      );
      assert.equal(directRes.status, 200);
      assert.deepEqual(await directRes.json(), { received: true });

      // Alias route with Authorization: Bearer
      const validReq = new NextRequest("http://localhost/api/webhook/admin/new_onboarding", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret-456" },
        body: JSON.stringify({
          onboarding_id: "onb-99",
          user_id: USER_ID,
          user_email: "customer@example.com",
          site_name: "fastsite.com",
        }),
      });
      const validRes = await webhookAlias.POST(validReq);
      assert.equal(validRes.status, 200);
      assert.deepEqual(await validRes.json(), { received: true });

      await flushAfter();

      // Only sends admin emails; never queries system_settings, orders, or runs assignment
      assert.equal(backend.sentEmails.length, 2);
      assert.deepEqual(backend.sentEmails[0].to, ["thespeedysite@gmail.com"]);
      assert.match(backend.sentEmails[0].subject, /directsite\.com/);
      assert.match(backend.sentEmails[1].subject, /fastsite\.com/);
      assert.ok(backend.sentEmails[1].html.includes("https://speedy.site/dashboard/queue"));
      assert.ok(!backend.sentEmails[1].html.includes("/dashboard/admin/queue"));
      assert.equal(backend.restCalls.length, 0);
      assert.equal(backend.getRpcCount(), 0);
      assert.equal(backend.db.order_assignments.length, 0);
    });
  });

  describe("Items 2 & 3: Auto-Assignment Toggle + Separate after() Order Ingestion", () => {
    it("gates settings API to admins and toggles auto_assignment_enabled", async () => {
      const unauthRes = await settingsRoute.GET();
      assert.equal(unauthRes.status, 401);

      setAuthUser(USER_ID);
      const userRes = await settingsRoute.PATCH(
        new NextRequest("http://localhost/api/admin/settings/auto-assignment", {
          method: "PATCH",
          body: JSON.stringify({ enabled: false }),
        }),
      );
      assert.equal(userRes.status, 403);

      setAuthUser(ADMIN_ID);
      const badBodyRes = await settingsRoute.PATCH(
        new NextRequest("http://localhost/api/admin/settings/auto-assignment", {
          method: "PATCH",
          body: JSON.stringify({ enabled: "nope" }),
        }),
      );
      assert.equal(badBodyRes.status, 400);

      const disableRes = await settingsRoute.PATCH(
        new NextRequest("http://localhost/api/admin/settings/auto-assignment", {
          method: "PATCH",
          body: JSON.stringify({ enabled: false }),
        }),
      );
      assert.equal(disableRes.status, 200);
      assert.equal((await disableRes.json()).enabled, false);

      const getRes = await settingsRoute.GET();
      assert.equal(getRes.status, 200);
      assert.equal((await getRes.json()).enabled, false);
    });

    it("runs auto-assignment in after() on order ingestion when enabled, skips when disabled, and leaves unassigned if pool is exhausted", async () => {
      // 1. Auto-assignment enabled (default true)
      setAuthUser(USER_ID);
      const orderReq1 = new NextRequest("http://localhost/api/orders/newOrder", {
        method: "POST",
        body: JSON.stringify({
          orderData: {
            website_name: "site-one.example.com",
            website_address: "https://site-one.example.com",
            order_status: true,
          },
        }),
      });
      const orderRes1 = await newOrderRoute.POST(orderReq1);
      assert.equal(orderRes1.status, 200);
      const body1 = await orderRes1.json();
      assert.equal(body1.order.website_name, "site-one.example.com");

      await flushAfter();

      assert.equal(backend.getRpcCount(), 1);
      assert.equal(backend.db.order_assignments.length, 1);
      assert.equal(backend.db.order_assignments[0].order_id, body1.order.order_id);
      assert.equal(backend.db.order_assignments[0].assigned_by, null);
      assert.equal(backend.db.order_assignments[0].status, "pending");
      assert.equal(backend.db.notifications.length, 1);
      assert.equal(backend.db.notifications[0].link, "/dashboard/orders");
      assert.equal(backend.sentEmails.length, 1);
      assert.match(backend.sentEmails[0].html, /https:\/\/speedy\.site\/dashboard\/orders/);

      // 2. Disable auto-assignment via admin toggle, then ingest a second order
      setAuthUser(ADMIN_ID);
      await settingsRoute.PATCH(
        new NextRequest("http://localhost/api/admin/settings/auto-assignment", {
          method: "PATCH",
          body: JSON.stringify({ enabled: false }),
        }),
      );

      // Provision a second unused managed_wp entitlement for the user
      backend.db.user_services.push({
        id: "svc-2",
        user_id: USER_ID,
        service_type: "managed_wp",
        status: "active",
        metadata: { site_limit: 1 },
        order_id: null,
        website_name: null,
      });

      setAuthUser(USER_ID);
      const orderReq2 = new NextRequest("http://localhost/api/orders/newOrder", {
        method: "POST",
        body: JSON.stringify({
          orderData: {
            website_name: "site-two.example.com",
            website_address: "https://site-two.example.com",
            order_status: true,
          },
        }),
      });
      const orderRes2 = await newOrderRoute.POST(orderReq2);
      assert.equal(orderRes2.status, 200);
      const body2 = await orderRes2.json();

      await flushAfter();

      // Still only 1 assignment & 1 RPC call: second order stayed in unassigned queue
      assert.equal(backend.getRpcCount(), 1);
      assert.equal(backend.db.order_assignments.length, 1);
      assert.equal(backend.sentEmails.length, 1);

      // 3. Re-enable auto-assignment, mark all experts unavailable -> runAutoAssignmentIfEnabled returns fallback without error
      await assignmentEngine.setAutoAssignmentSetting(true, ADMIN_ID);
      for (const e of backend.db.experts_pool) e.is_available = false;
      const fallbackResult = await assignmentEngine.runAutoAssignmentIfEnabled(body2.order.order_id);
      assert.equal(fallbackResult.success, false);
      assert.match(fallbackResult.reason, /unassigned queue/);
      assert.equal(backend.db.order_assignments.length, 1);
    });
  });

  describe("Items 4 & 5: Manual Assignment & Unified Notification Dispatch", () => {
    it("assigns and reassigns orders, enforces admin/validation, and dispatches notifications", async () => {
      backend.db.orders.push({
        order_id: "ord-manual-1",
        user_id: USER_ID,
        website_name: "manual.example.com",
        website_address: "https://manual.example.com",
        order_status: true,
      });

      setAuthUser(EXPERT_1);
      const forbiddenRes = await assignmentsRoute.POST(
        new NextRequest("http://localhost/api/admin/assignments", {
          method: "POST",
          body: JSON.stringify({ order_id: "ord-manual-1", expert_id: EXPERT_1 }),
        }),
      );
      assert.equal(forbiddenRes.status, 403);

      setAuthUser(ADMIN_ID);
      const missingOrderRes = await assignmentsRoute.POST(
        new NextRequest("http://localhost/api/admin/assignments", {
          method: "POST",
          body: JSON.stringify({ order_id: "ord-does-not-exist", expert_id: EXPERT_1 }),
        }),
      );
      assert.equal(missingOrderRes.status, 404);

      const assignRes = await assignmentsRoute.POST(
        new NextRequest("http://localhost/api/admin/assignments", {
          method: "POST",
          body: JSON.stringify({ onboarding_id: "ord-manual-1", expertId: EXPERT_1 }),
        }),
      );
      assert.equal(assignRes.status, 201);
      const assignJson = await assignRes.json();
      assert.equal(assignJson.success, true);
      assert.equal(assignJson.assignment.expert_id, EXPERT_1);
      assert.equal(assignJson.assignment.assigned_by, ADMIN_ID);
      assert.ok(backend.db.experts_pool[0].last_assigned_at);
      assert.equal(backend.db.notifications.length, 1);
      assert.equal(backend.sentEmails.length, 1);
      assert.deepEqual(backend.sentEmails[0].to, ["expert1@example.com"]);

      // Re-posting same expert returns 409
      const dupRes = await assignmentsRoute.POST(
        new NextRequest("http://localhost/api/admin/assignments", {
          method: "POST",
          body: JSON.stringify({ order_id: "ord-manual-1", expert_id: EXPERT_1 }),
        }),
      );
      assert.equal(dupRes.status, 409);

      // Reassigning to EXPERT_2 deactivates prior row and notifies EXPERT_2
      const reassignRes = await assignmentsRoute.POST(
        new NextRequest("http://localhost/api/admin/assignments", {
          method: "POST",
          body: JSON.stringify({
            orderId: "ord-manual-1",
            expert_id: EXPERT_2,
            notes: "Balancing queue",
          }),
        }),
      );
      assert.equal(reassignRes.status, 201);
      assert.equal(backend.db.order_assignments.length, 2);
      assert.equal(backend.db.order_assignments[0].is_active, false);
      assert.equal(backend.db.order_assignments[0].status, "reassigned");
      assert.equal(backend.db.order_assignments[0].skip_reason, "Balancing queue");
      assert.equal(backend.db.order_assignments[1].is_active, true);
      assert.equal(backend.db.order_assignments[1].expert_id, EXPERT_2);
      assert.equal(backend.db.notifications.length, 2);
      assert.equal(backend.sentEmails.length, 2);
      assert.deepEqual(backend.sentEmails[1].to, ["expert2@example.com"]);
    });
  });

  describe("Item 6: Cross-Portal Consistency Guard (Inset-Header)", () => {
    it("shows setup status/connected badge only for customer role and hides for admin and expert", () => {
      globalThis.__TEST_UI_MOCKS__ = {
        user: { id: USER_ID },
        role: "user",
        selectedSite: "site.example.com",
        orders: [{ website_name: "site.example.com", tour: {} }],
      };
      const userPendingHtml = renderToStaticMarkup(React.createElement(SidebarInsetHeader));
      assert.match(userPendingHtml, /Setup status/);

      globalThis.__TEST_UI_MOCKS__.orders = [
        { website_name: "site.example.com", tour: { signature_verified: true } },
      ];
      const userConnectedHtml = renderToStaticMarkup(React.createElement(SidebarInsetHeader));
      assert.match(userConnectedHtml, /Connected/);

      globalThis.__TEST_UI_MOCKS__.role = "admin";
      const adminHtml = renderToStaticMarkup(React.createElement(SidebarInsetHeader));
      assert.doesNotMatch(adminHtml, /Setup status|Connected/);

      globalThis.__TEST_UI_MOCKS__.role = "expert";
      const expertHtml = renderToStaticMarkup(React.createElement(SidebarInsetHeader));
      assert.doesNotMatch(expertHtml, /Setup status|Connected/);
    });
  });
});
