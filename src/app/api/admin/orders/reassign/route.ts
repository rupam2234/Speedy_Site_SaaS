import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";
import { dispatchAssignmentNotification } from "@/lib/services/assignmentService";

const worker = setupDB();

// POST /api/admin/orders/reassign  { orderId, expertId, skipReason? }
// Deactivates the current active assignment (marking it 'reassigned') and
// appends a new pending one. History is preserved.
export async function POST(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { orderId, expertId, skipReason } = await req.json();
    if (!orderId || !expertId) return NextResponse.json({ message: "orderId and expertId required" }, { status: 400 });

    const { data: current, error: currentError } = await (worker as any)
      .from("order_assignments")
      .select("id, expert_id")
      .eq("order_id", orderId)
      .eq("is_active", true)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);
    if (!current) return NextResponse.json({ message: "No active assignment to reassign" }, { status: 404 });
    if (current.expert_id === expertId) return NextResponse.json({ message: "Order is already assigned to this expert" }, { status: 409 });

    const { error: deactivateError } = await (worker as any)
      .from("order_assignments")
      .update({ is_active: false, status: "reassigned", skip_reason: skipReason ?? null })
      .eq("id", current.id);
    if (deactivateError) throw new Error(deactivateError.message);

    const { data, error } = await (worker as any)
      .from("order_assignments")
      .insert({ order_id: orderId, expert_id: expertId, assigned_by: gate.userId, status: "pending" })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await dispatchAssignmentNotification(orderId, expertId);

    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
