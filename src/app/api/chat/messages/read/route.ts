import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { getSupabaseServerUser } from "@/app/api/helpers/getSupabaseUser";

const worker = setupDB();

// Marks unread incoming messages as read for the authenticated recipient.
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getSupabaseServerUser();
  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json({ message: "Missing conversationId" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { error } = await (worker as any)
      .from("order_messages")
      .update({ read_at: now })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (error) throw error;

    return NextResponse.json({ success: true, readAt: now }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to mark read" }, { status: 500 });
  }
}
