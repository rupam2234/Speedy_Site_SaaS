import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

// transitions each role may perform on an active assignment
const EXPERT_NEXT: Record<string, string[]> = {
  pending: ["accepted"],
  accepted: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: [],
};

// PATCH /api/expert/orders/status  { assignmentId, status }
export async function PATCH(req: NextRequest) {
  const gate = await requireRole(["expert"]);
  if (gate.response) return gate.response;

  try {
    const { assignmentId, status } = await req.json();

    if (!assignmentId || !status) {
      return NextResponse.json({ message: "assignmentId and status required" }, { status: 400 });
    }

    const { data: current, error: currentError } = await (worker as any)
      .from("order_assignments")
      .select("id, expert_id, status, is_active")
      .eq("id", assignmentId)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);
    if (!current) return NextResponse.json({ message: "Assignment not found" }, { status: 404 });
    if (current.expert_id !== gate.userId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    if (!current.is_active) return NextResponse.json({ message: "Assignment is no longer active" }, { status: 409 });

    const allowed = EXPERT_NEXT[current.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ message: `Cannot move from ${current.status} to ${status}` }, { status: 409 });
    }

    const update: Record<string, unknown> = { status };
    if (status === "accepted") update.accepted_at = new Date().toISOString();
    if (status === "completed") update.completed_at = new Date().toISOString();

    const { error } = await (worker as any).from("order_assignments").update(update).eq("id", assignmentId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ message: "Status updated" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
