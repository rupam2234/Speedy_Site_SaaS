import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { dispatchUnreadChatDigest, type UnreadDigestBatch } from "@/app/api/emails/chatNotification";
import type { ChannelType } from "@/lib/chat/types";

const worker = setupDB();

// Verifies bearer token or webhook secret from request headers.
function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_WEBHOOK_SECRET;
  const cronSecret = process.env.CRON_SECRET_TOKEN;

  const validSecrets = [adminSecret, cronSecret].filter(Boolean) as string[];
  if (validSecrets.length === 0) {
    return false;
  }

  const headerSecret = req.headers.get("x-webhook-secret");
  if (headerSecret && validSecrets.includes(headerSecret)) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (validSecrets.includes(bearerToken)) {
      return true;
    }
  }

  return false;
}

// Scans for unread messages older than 15 minutes and sends email digests.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // 1. Query candidate unread messages past the 15-minute grace window
    const { data: rawMessages, error: msgError } = await (worker as any)
      .from("order_messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at, email_notified_at")
      .is("read_at", null)
      .is("email_notified_at", null)
      .lte("created_at", cutoffTime)
      .order("created_at", { ascending: true });

    if (msgError) {
      throw msgError;
    }

    if (!rawMessages || rawMessages.length === 0) {
      return NextResponse.json({ status: "ok", processed: 0, digestsSent: 0 });
    }

    // 2. Fetch conversations for candidate messages
    const conversationIds = Array.from(new Set(rawMessages.map((m: any) => m.conversation_id)));
    const { data: conversations, error: convError } = await (worker as any)
      .from("order_conversations")
      .select("id, order_id, channel_type")
      .in("id", conversationIds);

    if (convError) throw convError;

    const convMap = new Map<string, { id: string; order_id: string; channel_type: ChannelType }>();
    for (const c of conversations ?? []) {
      convMap.set(c.id, c);
    }

    // 3. Fetch orders
    const orderIds = Array.from(new Set((conversations ?? []).map((c: any) => c.order_id)));
    const { data: orders, error: orderError } = await (worker as any)
      .from("orders")
      .select("order_id, user_id, website_name")
      .in("order_id", orderIds);

    if (orderError) throw orderError;

    const orderMap = new Map<string, { order_id: string; user_id: string; website_name: string }>();
    for (const o of orders ?? []) {
      orderMap.set(o.order_id, o);
    }

    // 4. Fetch active expert assignments
    const { data: assignments } = await (worker as any)
      .from("order_assignments")
      .select("order_id, expert_id")
      .in("order_id", orderIds)
      .eq("is_active", true);

    const assignmentMap = new Map<string, string>();
    for (const a of assignments ?? []) {
      assignmentMap.set(a.order_id, a.expert_id);
    }

    // 5. Fetch admins
    const { data: adminProfiles } = await (worker as any)
      .from("profiles")
      .select("id, email, role")
      .eq("role", "admin");

    const adminIds = (adminProfiles ?? []).map((a: any) => a.id);

    // 6. Fetch profiles for senders, owners, and experts
    const allUserIds = Array.from(
      new Set([
        ...rawMessages.map((m: any) => m.sender_id),
        ...(orders ?? []).map((o: any) => o.user_id),
        ...(assignments ?? []).map((a: any) => a.expert_id),
        ...adminIds,
      ].filter(Boolean))
    );

    const { data: profiles, error: profileError } = await (worker as any)
      .from("profiles")
      .select("id, email, role")
      .in("id", allUserIds);

    if (profileError) throw profileError;

    const profileMap = new Map<string, { id: string; email: string; role: string }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p);
    }

    // 7. Group unread messages by recipient and conversation
    const batchMap = new Map<string, UnreadDigestBatch>();

    for (const msg of rawMessages) {
      const conv = convMap.get(msg.conversation_id);
      if (!conv) continue;

      const order = orderMap.get(conv.order_id);
      if (!order) continue;

      const sender = profileMap.get(msg.sender_id);
      const senderRole = sender?.role || "user";
      const senderEmail = sender?.email || "unknown@speedy.site";

      const recipientIds: string[] = [];

      if (conv.channel_type === "client") {
        if (senderRole === "user") {
          const assignedExpertId = assignmentMap.get(order.order_id);
          if (assignedExpertId && assignedExpertId !== msg.sender_id) {
            recipientIds.push(assignedExpertId);
          }
        } else {
          // Sender is expert or staff; recipient is order owner
          if (order.user_id && order.user_id !== msg.sender_id) {
            recipientIds.push(order.user_id);
          }
        }
      } else {
        // Internal channel
        if (senderRole === "admin") {
          const assignedExpertId = assignmentMap.get(order.order_id);
          if (assignedExpertId && assignedExpertId !== msg.sender_id) {
            recipientIds.push(assignedExpertId);
          }
        } else {
          // Sender is expert; notify platform admins
          for (const aId of adminIds) {
            if (aId !== msg.sender_id) {
              recipientIds.push(aId);
            }
          }
        }
      }

      for (const rId of recipientIds) {
        const recipient = profileMap.get(rId);
        if (!recipient || !recipient.email) continue;

        const batchKey = `${rId}:${conv.id}`;
        let batch = batchMap.get(batchKey);
        if (!batch) {
          batch = {
            recipientEmail: recipient.email,
            recipientRole: recipient.role,
            orderId: order.order_id,
            websiteName: order.website_name || "Website",
            channelType: conv.channel_type,
            messages: [],
          };
          batchMap.set(batchKey, batch);
        }

        batch.messages.push({
          id: msg.id,
          senderEmail,
          senderRole,
          body: msg.body,
          createdAt: msg.created_at,
        });
      }
    }

    // 8. Dispatch unread digests
    let totalDigestsSent = 0;
    let totalProcessed = 0;

    for (const batch of batchMap.values()) {
      const result = await dispatchUnreadChatDigest(batch);
      if (result.success) {
        totalDigestsSent += 1;
        totalProcessed += result.messageCount;
      }
    }

    return NextResponse.json({
      status: "ok",
      processed: totalProcessed,
      digestsSent: totalDigestsSent,
    });
  } catch (err: any) {
    console.error("Cron unread chat notifications error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to process chat notifications" },
      { status: 500 }
    );
  }
}
