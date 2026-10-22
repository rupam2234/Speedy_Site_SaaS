import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// POST /api/admin/orders/assign  { orderId, expertId? }
// expertId omitted  -> auto round-robin via pick_next_expert()
// expertId provided -> force-assign (bypasses RR and capacity)
export async function POST(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { orderId, expertId } = await req.json();
    if (!orderId) return NextResponse.json({ message: "orderId required" }, { status: 400 });

    const { data: existing, error: existingError } = await (worker as any)
      .from("order_assignments")
      .select("id, expert_id")
      .eq("order_id", orderId)
      .eq("is_active", true)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing) return NextResponse.json({ message: "Order already has an active assignment" }, { status: 409 });

    let assignedExpertId = expertId as string | undefined;

    if (!assignedExpertId) {
      const { data: picked, error: pickError } = await (worker as any).rpc("pick_next_expert");
      if (pickError) throw new Error(pickError.message);
      if (!picked) {
        return NextResponse.json({ message: "No eligible expert available (unassigned queue)" }, { status: 409 });
      }
      assignedExpertId = picked as string;
    }

    const { data, error } = await (worker as any)
      .from("order_assignments")
      .insert({ order_id: orderId, expert_id: assignedExpertId, assigned_by: gate.userId, status: "pending" })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
