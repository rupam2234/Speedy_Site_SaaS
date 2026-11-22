import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";
import type { ChannelType } from "@/lib/chat/types";

const worker = setupDB();

// Validates access and returns conversation channels for an order.
export async function GET(req: NextRequest) {
  const { user, error: authError } = await getSupabaseServerUser();
  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ message: "Missing orderId" }, { status: 400 });
  }

  try {
    // 1. Get user role
    const { data: profile } = await (worker as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "user";

    // 2. Verify authorization
    const { data: order } = await (worker as any)
      .from("orders")
      .select("order_id, user_id, website_name")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const isCustomer = order.user_id === user.id;

    let isAssignedExpert = false;
    if (role === "expert") {
      const { data: assignment } = await (worker as any)
        .from("order_assignments")
        .select("id")
        .eq("order_id", orderId)
        .eq("expert_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      isAssignedExpert = !!assignment;
    }

    const isAdmin = role === "admin";

    if (!isCustomer && !isAssignedExpert && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // 3. Ensure both conversations exist for this order
    const requiredChannels: ChannelType[] = isAdmin || isAssignedExpert
      ? ["client", "internal"]
      : ["client"];

    for (const channel of ["client", "internal"]) {
      await (worker as any)
        .from("order_conversations")
        .upsert(
          { order_id: orderId, channel_type: channel },
          { onConflict: "order_id,channel_type", ignoreDuplicates: true }
        );
    }

    // 4. Query conversations
    const { data: conversations, error: convError } = await (worker as any)
      .from("order_conversations")
      .select("id, order_id, channel_type, created_at, updated_at, last_message_at")
      .eq("order_id", orderId)
      .in("channel_type", requiredChannels);

    if (convError) throw convError;

    // 5. Calculate unread counts
    const convoIds = (conversations ?? []).map((c: any) => c.id);
    const { data: unreadRows } = await (worker as any)
      .from("order_messages")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .neq("sender_id", user.id)
      .is("read_at", null);

    const unreadMap: Record<string, number> = {};
    for (const row of unreadRows ?? []) {
      unreadMap[row.conversation_id] = (unreadMap[row.conversation_id] || 0) + 1;
    }

    const result = (conversations ?? []).map((c: any) => ({
      id: c.id,
      orderId: c.order_id,
      channelType: c.channel_type as ChannelType,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      lastMessageAt: c.last_message_at,
      unreadCount: unreadMap[c.id] || 0,
    }));

    return NextResponse.json({ conversations: result, role, websiteName: order.website_name }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to fetch conversations" }, { status: 500 });
  }
}
