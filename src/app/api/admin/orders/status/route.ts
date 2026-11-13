import { NextRequest, NextResponse } from "next/server";
import { setupDB } from "@/lib/db";
import { requireRole } from "@/app/api/helpers/requireRole";

const worker = setupDB();

const ALLOWED = new Set(["pending", "accepted", "in_progress", "completed", "skipped", "reassigned"]);

// PATCH /api/admin/orders/status  { assignmentId, status }
// Admin override of any assignment status.
export async function PATCH(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const { assignmentId, status } = await req.json();
    if (!assignmentId || !ALLOWED.has(status)) {
      return NextResponse.json({ message: "assignmentId and a valid status required" }, { status: 400 });
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
