import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Env must be set before importing route/db modules
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://mock.supabase.local";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
process.env.RESEND_API_KEY = "re_test_mock_key";
process.env.NEXT_PUBLIC_PROD_BASE_URL = "https://speedy.site";

const { NextRequest } = await import("next/server");

const ADMIN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";
const EXPERT_1 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const EXPERT_UNASSIGNED = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee99";
const ORDER_1 = "ooooooo1-oooo-oooo-oooo-oooooooooooo";

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
      })
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
      { id: OTHER_USER_ID, email: "other@example.com", role: "user" },
      { id: EXPERT_1, email: "expert1@example.com", role: "expert" },
      { id: EXPERT_UNASSIGNED, email: "expert2@example.com", role: "expert" },
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
          if (isVal === "null" && row[k] !== null) return false;
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

    // Supabase Auth mock
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

    // Supabase REST mock
    if (url.hostname === "mock.supabase.local" && url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.replace("/rest/v1/", "");
      // console.log("REST:", table, url.search);
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
        const onConflict = url.searchParams.get("on_conflict");
        const inserted = [];
        for (const item of items) {
          const rec = { ...item };
          if (table === "order_conversations") {
            const existing = db.order_conversations.find(
              (c) => c.order_id === rec.order_id && c.channel_type === rec.channel_type
            );
            if (existing) {
              inserted.push(existing);
              continue;
            }
            rec.id = rec.id || `conv-${rec.channel_type}-${db.order_conversations.length + 1}`;
            rec.created_at = rec.created_at || new Date().toISOString();
            rec.updated_at = rec.updated_at || new Date().toISOString();
            rec.last_message_at = rec.last_message_at || new Date().toISOString();
          }
          if (table === "order_messages" && !rec.id) {
            rec.id = `msg-${db.order_messages.length + 1}`;
            rec.created_at = rec.created_at || new Date().toISOString();
            rec.read_at = rec.read_at || null;
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

describe("Order Communication Channels (ADR-0002)", () => {
  let originalFetch;
  let backend;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    backend = createMockBackend();
    globalThis.fetch = backend.mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete globalThis.__TEST_COOKIES__;
  });

  it("allows customer to read and post in client channel, but denies internal channel", async () => {
    setAuthUser(USER_ID);

    const { GET, POST } = await import("../src/app/api/chat/messages/route.ts");

    // 1. Customer can read client channel
    const clientReq = new NextRequest(`http://localhost:3000/api/chat/messages?orderId=${ORDER_1}&channelType=client`);
    const clientRes = await GET(clientReq);
    assert.equal(clientRes.status, 200);
    const clientJson = await clientRes.json();
    assert.equal(clientJson.isReadOnly, false);

    // 2. Customer can post message in client channel
    const postReq = new NextRequest("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: ORDER_1,
        channelType: "client",
        body: "Hello expert, site TTFB is improving!",
      }),
    });
    const postRes = await POST(postReq);
    assert.equal(postRes.status, 201);
    const postJson = await postRes.json();
    assert.equal(postJson.message.body, "Hello expert, site TTFB is improving!");

    // 3. Customer is forbidden from accessing internal channel
    const internalReq = new NextRequest(`http://localhost:3000/api/chat/messages?orderId=${ORDER_1}&channelType=internal`);
    const internalRes = await GET(internalReq);
    assert.equal(internalRes.status, 403);

    const postInternalReq = new NextRequest("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: ORDER_1,
        channelType: "internal",
        body: "Attempting to post to staff channel",
      }),
    });
    const postInternalRes = await POST(postInternalReq);
    assert.equal(postInternalRes.status, 403);
  });

  it("enforces admin read-only observation on client channel and write access on internal channel", async () => {
    setAuthUser(ADMIN_ID);

    const { GET, POST } = await import("../src/app/api/chat/messages/route.ts");

    // 1. Admin can inspect client channel with isReadOnly = true
    const clientReq = new NextRequest(`http://localhost:3000/api/chat/messages?orderId=${ORDER_1}&channelType=client`);
    const clientRes = await GET(clientReq);
    assert.equal(clientRes.status, 200);
    const clientJson = await clientRes.json();
    assert.equal(clientJson.isReadOnly, true);

    // 2. Admin cannot post into client channel (strictly rejected)
    const postClientReq = new NextRequest("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: ORDER_1,
        channelType: "client",
        body: "Admin attempting to talk to customer directly",
      }),
    });
    const postClientRes = await POST(postClientReq);
    assert.equal(postClientRes.status, 403);
    const postClientJson = await postClientRes.json();
    assert.match(postClientJson.message, /read-only inspection access/i);

    // 3. Admin can post into internal backchannel
    const postInternalReq = new NextRequest("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: ORDER_1,
        channelType: "internal",
        body: "Please check WordPress object cache plugin config.",
      }),
    });
    const postInternalRes = await POST(postInternalReq);
    assert.equal(postInternalRes.status, 201);
  });

  it("allows assigned expert to participate in both client and internal channels", async () => {
    setAuthUser(EXPERT_1);

    const { GET, POST } = await import("../src/app/api/chat/messages/route.ts");

    // 1. Expert can post in client channel
    const postClientReq = new NextRequest("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: ORDER_1,
        channelType: "client",
        body: "Optimization completed, please test your checkout flow.",
      }),
    });
    const postClientRes = await POST(postClientReq);
    assert.equal(postClientRes.status, 201);

    // 2. Expert can post in internal channel
    const postInternalReq = new NextRequest("http://localhost:3000/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: ORDER_1,
        channelType: "internal",
        body: "Customer site had W3 Total Cache conflict, resolved.",
      }),
    });
    const postInternalRes = await POST(postInternalReq);
    assert.equal(postInternalRes.status, 201);
  });

  it("rejects unassigned expert from accessing channels of unassigned orders", async () => {
    setAuthUser(EXPERT_UNASSIGNED);

    const { GET } = await import("../src/app/api/chat/messages/route.ts");

    const req = new NextRequest(`http://localhost:3000/api/chat/messages?orderId=${ORDER_1}&channelType=client`);
    const res = await GET(req);
    assert.equal(res.status, 403);
  });

  it("updates read receipts when messages are viewed", async () => {
    setAuthUser(EXPERT_1);

    // Add unread message from customer
    backend.db.order_messages.push({
      id: "msg-cust-1",
      conversation_id: "conv-client-1",
      sender_id: USER_ID,
      body: "Need help with caching",
      is_system: false,
      created_at: new Date().toISOString(),
      read_at: null,
    });

    const { POST: markRead } = await import("../src/app/api/chat/messages/read/route.ts");

    const req = new NextRequest("http://localhost:3000/api/chat/messages/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: "conv-client-1" }),
    });

    const res = await markRead(req);
    assert.equal(res.status, 200);

    const updated = backend.db.order_messages.find((m) => m.id === "msg-cust-1");
    assert.ok(updated.read_at);
  });
});
