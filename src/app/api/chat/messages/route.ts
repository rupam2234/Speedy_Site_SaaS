import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import { dispatchInAppChatNotification } from "@/app/api/emails/chatNotification";
import type { ChannelType, OrderMessage } from "@/lib/chat/types";

const worker = setupDB();

// Helper to determine role and order permissions for the user.
async function verifyChannelAccess(userId: string, orderId: string, channelType: ChannelType) {
  const { data: profile } = await (worker as any)
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .maybeSingle();

  const role = profile?.role || "user";
  const email = profile?.email || "";

  const { data: order } = await (worker as any)
    .from("orders")
    .select("order_id, user_id, website_name")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order) return { error: "Order not found", status: 404 };

  const isCustomer = order.user_id === userId;
  let isAssignedExpert = false;

  if (role === "expert") {
    const { data: assignment } = await (worker as any)
      .from("order_assignments")
      .select("id")
      .eq("order_id", orderId)
      .eq("expert_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    isAssignedExpert = !!assignment;
  }

  const isAdmin = role === "admin";

  // Permission verification
  if (channelType === "internal") {
    if (!isAdmin && !isAssignedExpert) {
      return { error: "Internal channel is restricted to platform staff", status: 403 };
    }
  } else if (channelType === "client") {
    if (!isCustomer && !isAssignedExpert && !isAdmin) {
      return { error: "Forbidden", status: 403 };
    }
  }

  return {
    role,
    email,
    order,
    isAdmin,
    isCustomer,
    isAssignedExpert,
    isReadOnly: isAdmin && channelType === "client",
  };
}

// GET: Fetches messages for an order channel.
export async function GET(req: NextRequest) {
  const { user, error: authError } = await getSupabaseServerUser();
  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const channelType = (searchParams.get("channelType") as ChannelType) || "client";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const before = searchParams.get("before");

  if (!orderId) {
    return NextResponse.json({ message: "Missing orderId" }, { status: 400 });
  }

  try {
    const auth = await verifyChannelAccess(user.id, orderId, channelType);
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    // Ensure conversation exists
    await (worker as any)
      .from("order_conversations")
      .upsert(
        { order_id: orderId, channel_type: channelType },
        { onConflict: "order_id,channel_type", ignoreDuplicates: true }
      );

    const { data: conversation, error: convError } = await (worker as any)
      .from("order_conversations")
      .select("id, order_id, channel_type, created_at, updated_at, last_message_at")
      .eq("order_id", orderId)
      .eq("channel_type", channelType)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    // Query messages
    let query = (worker as any)
      .from("order_messages")
      .select("id, conversation_id, sender_id, body, is_system, created_at, read_at, email_notified_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: rawMessages, error: msgError } = await query;
    if (msgError) throw msgError;

    // Attach sender profiles
    const senderIds = Array.from(new Set((rawMessages ?? []).map((m: any) => m.sender_id)));
    const { data: profiles } = await (worker as any)
      .from("profiles")
      .select("id, email, role")
      .in("id", senderIds);

    const profileMap = new Map<string, { email: string; role: string }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { email: p.email ?? "", role: p.role ?? "user" });
    }

    const messages: OrderMessage[] = (rawMessages ?? [])
      .reverse()
      .map((m: any) => {
        const sender = profileMap.get(m.sender_id);
        return {
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          body: m.body,
          isSystem: m.is_system,
          createdAt: m.created_at,
          readAt: m.read_at,
          emailNotifiedAt: m.email_notified_at ?? null,
          senderEmail: sender?.email || null,
          senderRole: (sender?.role as any) || "user",
        };
      });

    return NextResponse.json({
      conversation,
      messages,
      isReadOnly: auth.isReadOnly,
      userRole: auth.role,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to load messages" }, { status: 500 });
  }
}

// POST: Sends a new message with strict role-gated access control.
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getSupabaseServerUser();
  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const { orderId, channelType, body } = payload;

    if (!orderId || !channelType || !body || typeof body !== "string") {
      return NextResponse.json({ message: "Invalid request payload" }, { status: 400 });
    }

    const trimmedBody = body.trim();
    if (trimmedBody.length === 0 || trimmedBody.length > 5000) {
      return NextResponse.json({ message: "Message body must be between 1 and 5000 characters" }, { status: 400 });
    }

    const auth = await verifyChannelAccess(user.id, orderId, channelType as ChannelType);
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    // Role-gated write rules from ADR-0002
    if (auth.isAdmin && channelType === "client") {
      return NextResponse.json(
        { message: "Administrators have read-only inspection access on customer threads; posting is disabled" },
        { status: 403 }
      );
    }

    if (auth.isCustomer && channelType === "internal") {
      return NextResponse.json({ message: "Customers cannot post to internal channel" }, { status: 403 });
    }

    // Ensure conversation exists
    await (worker as any)
      .from("order_conversations")
      .upsert(
        { order_id: orderId, channel_type: channelType },
        { onConflict: "order_id,channel_type", ignoreDuplicates: true }
      );

    const { data: conversation } = await (worker as any)
      .from("order_conversations")
      .select("id")
      .eq("order_id", orderId)
      .eq("channel_type", channelType)
      .single();

    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    // Insert message
    const { data: inserted, error: insertError } = await (worker as any)
      .from("order_messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        body: trimmedBody,
        is_system: false,
      })
      .select("id, conversation_id, sender_id, body, is_system, created_at, read_at, email_notified_at")
      .single();

    if (insertError) throw insertError;

    // Bump conversation timestamp
    await (worker as any)
      .from("order_conversations")
      .update({ last_message_at: inserted.created_at, updated_at: inserted.created_at })
      .eq("id", conversation.id);

    // Asynchronously dispatch immediate in-app bell notifications
    dispatchInAppChatNotification({
      orderId,
      websiteName: auth.order.website_name || "Website",
      channelType,
      senderId: user.id,
      senderEmail: auth.email,
      senderRole: auth.role,
      messagePreview: trimmedBody,
    });

    const createdMessage: OrderMessage = {
      id: inserted.id,
      conversationId: inserted.conversation_id,
      senderId: inserted.sender_id,
      body: inserted.body,
      isSystem: inserted.is_system,
      createdAt: inserted.created_at,
      readAt: inserted.read_at,
      emailNotifiedAt: inserted.email_notified_at ?? null,
      senderEmail: auth.email,
      senderRole: auth.role as any,
    };

    return NextResponse.json({ message: createdMessage }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to post message" }, { status: 500 });
  }
}
