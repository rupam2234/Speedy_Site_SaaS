import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://mock.supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
process.env.RESEND_API_KEY = "re_test_mock_key";
process.env.NEXT_PUBLIC_PROD_BASE_URL = "https://speedy.site";
process.env.CRON_SECRET_TOKEN = "test-cron-secret-xyz";
process.env.ADMIN_WEBHOOK_SECRET = "test-admin-secret-abc";

const { NextRequest } = await import("next/server");

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const EXPERT_1 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const ORDER_1 = "ooooooo1-oooo-oooo-oooo-oooooooooooo";

function createMockBackend() {
  const db = {
    profiles: [
      { id: ADMIN_ID, email: "admin@example.com", role: "admin" },
      { id: USER_ID, email: "customer@example.com", role: "user" },
      { id: EXPERT_1, email: "expert1@example.com", role: "expert" },
    ],
    orders: [
      {
        order_id: ORDER_1,
        user_id: USER_ID,
        website_name: "speedy-demo.com",
        website_address: "https://speedy-demo.com",
        order_date: new Date().toISOString(),
        order_status: true,
        product_type: "managed_wp",
      },
    ],
    order_assignments: [
      {
        id: "asn-1",
        order_id: ORDER_1,
        expert_id: EXPERT_1,
        status: "in_progress",
        is_active: true,
        assigned_at: new Date().toISOString(),
      },
    ],
    order_conversations: [
      {
        id: "conv-client-1",
        order_id: ORDER_1,
        channel_type: "client",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
      {
        id: "conv-internal-1",
        order_id: ORDER_1,
        channel_type: "internal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
    ],
    order_messages: [],
    notifications: [],
  };

  const sentEmails = [];

  function applyFilters(rows, params) {
    return rows.filter((row) => {
      for (const [k, v] of params.entries()) {
        if (k === "select" || k === "on_conflict" || k === "order" || k === "limit") continue;
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
        } else if (v.startsWith("in.")) {
          const raw = v.slice(4, -1);
          const allowed = raw.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
          if (!allowed.includes(String(row[k]))) return false;
        } else if (v.startsWith("neq.")) {
          const notAllowed = v.slice(4);
          if (String(row[k]) === notAllowed) return false;
        } else if (v.startsWith("is.")) {
          const isVal = v.slice(3);
          if (isVal === "null" && row[k] !== null && row[k] !== undefined) return false;
        } else if (v.startsWith("lte.")) {
          const threshold = v.slice(4);
          if (new Date(row[k]).getTime() > new Date(threshold).getTime()) return false;
        } else if (v.startsWith("gte.")) {
          const threshold = v.slice(4);
          if (new Date(row[k]).getTime() < new Date(threshold).getTime()) return false;
        }
      }
      return true;
    });
  }

  async function mockFetch(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method || "GET").toUpperCase();
    const headers = new Headers(init.headers);

    // Resend email mock
    if (url.hostname === "api.resend.com" && url.pathname === "/emails") {
      const body = init.body ? JSON.parse(init.body) : {};
      sentEmails.push(body);
      return new Response(JSON.stringify({ id: `email_${sentEmails.length}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Supabase REST mock
    if (url.hostname === "mock.supabase.local" && url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.replace("/rest/v1/", "");
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
        const inserted = [];
        for (const item of items) {
          const rec = { ...item };
          if (table === "order_messages" && !rec.id) {
            rec.id = `msg-${db.order_messages.length + 1}`;
            rec.created_at = rec.created_at || new Date().toISOString();
            rec.read_at = rec.read_at || null;
            rec.email_notified_at = rec.email_notified_at || null;
          }
          if (table === "notifications" && !rec.id) {
            rec.id = `notif-${db.notifications.length + 1}`;
            rec.created_at = new Date().toISOString();
          }
          rows.push(rec);
          inserted.push(rec);
        }
        const respData = wantSingle ? inserted[0] : inserted;
        return new Response(JSON.stringify(respData), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "PATCH") {
        const filtered = applyFilters(rows, url.searchParams);
        for (const r of filtered) {
          Object.assign(r, body);
        }
        return new Response(JSON.stringify(filtered), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unhandled mock" }), { status: 500 });
  }

  return { db, sentEmails, mockFetch };
}

describe("Delayed Chat Email Notifications (15-Minute Grace Window & Digest)", () => {
  let originalFetch;
  let backend;
  let cronHandler;

  beforeEach(async () => {
    backend = createMockBackend();
    originalFetch = globalThis.fetch;
    globalThis.fetch = backend.mockFetch;
    const mod = await import("../src/app/api/cron/chat-notifications/route.ts");
    cronHandler = mod.POST;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("Security Gate: rejects unauthorized invocations without valid secret", async () => {
    // 1. Missing authorization
    const req1 = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
    });
    const res1 = await cronHandler(req1);
    assert.equal(res1.status, 401);

    // 2. Invalid bearer token
    const req2 = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { authorization: "Bearer invalid-secret" },
    });
    const res2 = await cronHandler(req2);
    assert.equal(res2.status, 401);

    // 3. Valid bearer token
    const req3 = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res3 = await cronHandler(req3);
    assert.equal(res3.status, 200);

    // 4. Valid x-webhook-secret
    const req4 = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { "x-webhook-secret": "test-admin-secret-abc" },
    });
    const res4 = await cronHandler(req4);
    assert.equal(res4.status, 200);
  });

  it("Threshold Gate: ignores messages under 15 minutes and processes messages older than 15 minutes", async () => {
    const now = Date.now();
    // Message sent 10 minutes ago (within grace window)
    backend.db.order_messages.push({
      id: "msg-recent",
      conversation_id: "conv-client-1",
      sender_id: USER_ID,
      body: "Need quick help with PHP settings",
      is_system: false,
      created_at: new Date(now - 10 * 60 * 1000).toISOString(),
      read_at: null,
      email_notified_at: null,
    });

    // Message sent 20 minutes ago (past grace window)
    backend.db.order_messages.push({
      id: "msg-old",
      conversation_id: "conv-client-1",
      sender_id: USER_ID,
      body: "Database backup question",
      is_system: false,
      created_at: new Date(now - 20 * 60 * 1000).toISOString(),
      read_at: null,
      email_notified_at: null,
    });

    const req = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res = await cronHandler(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.processed, 1);
    assert.equal(json.digestsSent, 1);

    // Exactly 1 email sent to the assigned expert
    assert.equal(backend.sentEmails.length, 1);
    assert.deepEqual(backend.sentEmails[0].to, ["expert1@example.com"]);
    assert.match(backend.sentEmails[0].subject, /speedy-demo\.com/);
    assert.match(backend.sentEmails[0].subject, /CLIENT/);
    assert.ok(backend.sentEmails[0].html.includes("Database backup question"));
    assert.ok(!backend.sentEmails[0].html.includes("Need quick help with PHP settings"));

    // msg-old stamped with email_notified_at, msg-recent untouched
    const oldMsg = backend.db.order_messages.find((m) => m.id === "msg-old");
    const recentMsg = backend.db.order_messages.find((m) => m.id === "msg-recent");
    assert.ok(oldMsg.email_notified_at !== null);
    assert.equal(recentMsg.email_notified_at, null);
  });

  it("Suppression Gate: does not dispatch email if message was read within 15 minutes", async () => {
    const now = Date.now();
    // Message sent 25 minutes ago, but read 20 minutes ago
    backend.db.order_messages.push({
      id: "msg-read",
      conversation_id: "conv-client-1",
      sender_id: USER_ID,
      body: "I already looked at this",
      is_system: false,
      created_at: new Date(now - 25 * 60 * 1000).toISOString(),
      read_at: new Date(now - 20 * 60 * 1000).toISOString(),
      email_notified_at: null,
    });

    const req = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res = await cronHandler(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.processed, 0);
    assert.equal(json.digestsSent, 0);
    assert.equal(backend.sentEmails.length, 0);
  });

  it("Consolidation Gate: multiple unread messages from same conversation consolidate into one email", async () => {
    const now = Date.now();
    backend.db.order_messages.push(
      {
        id: "msg-batch-1",
        conversation_id: "conv-client-1",
        sender_id: USER_ID,
        body: "First unread note",
        is_system: false,
        created_at: new Date(now - 30 * 60 * 1000).toISOString(),
        read_at: null,
        email_notified_at: null,
      },
      {
        id: "msg-batch-2",
        conversation_id: "conv-client-1",
        sender_id: USER_ID,
        body: "Second unread note",
        is_system: false,
        created_at: new Date(now - 25 * 60 * 1000).toISOString(),
        read_at: null,
        email_notified_at: null,
      },
      {
        id: "msg-batch-3",
        conversation_id: "conv-client-1",
        sender_id: USER_ID,
        body: "Third unread note",
        is_system: false,
        created_at: new Date(now - 18 * 60 * 1000).toISOString(),
        read_at: null,
        email_notified_at: null,
      }
    );

    const req = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res = await cronHandler(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.processed, 3);
    assert.equal(json.digestsSent, 1);

    // Exactly 1 email sent containing all 3 message bodies
    assert.equal(backend.sentEmails.length, 1);
    assert.deepEqual(backend.sentEmails[0].to, ["expert1@example.com"]);
    assert.ok(backend.sentEmails[0].html.includes("3 unread messages"));
    assert.ok(backend.sentEmails[0].html.includes("First unread note"));
    assert.ok(backend.sentEmails[0].html.includes("Second unread note"));
    assert.ok(backend.sentEmails[0].html.includes("Third unread note"));

    // All 3 messages marked with email_notified_at
    for (const id of ["msg-batch-1", "msg-batch-2", "msg-batch-3"]) {
      const m = backend.db.order_messages.find((row) => row.id === id);
      assert.ok(m.email_notified_at !== null);
    }
  });

  it("Idempotency Gate: re-running cron produces 0 additional emails", async () => {
    const now = Date.now();
    backend.db.order_messages.push({
      id: "msg-idempotent",
      conversation_id: "conv-client-1",
      sender_id: USER_ID,
      body: "Testing idempotency",
      is_system: false,
      created_at: new Date(now - 20 * 60 * 1000).toISOString(),
      read_at: null,
      email_notified_at: null,
    });

    // Run 1: dispatches 1 email
    const req1 = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res1 = await cronHandler(req1);
    const json1 = await res1.json();
    assert.equal(json1.processed, 1);
    assert.equal(json1.digestsSent, 1);
    assert.equal(backend.sentEmails.length, 1);

    // Run 2: immediately afterwards produces 0 emails
    const req2 = new NextRequest("http://localhost:3000/api/cron/chat-notifications", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret-xyz" },
    });
    const res2 = await cronHandler(req2);
    const json2 = await res2.json();
    assert.equal(json2.processed, 0);
    assert.equal(json2.digestsSent, 0);
    assert.equal(backend.sentEmails.length, 1);
  });
});
