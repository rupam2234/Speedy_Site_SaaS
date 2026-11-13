import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/helpers/requireRole";
import { assignOrderManually } from "@/lib/services/assignmentService";

export const runtime = "nodejs";

export interface ManualAssignmentRequest {
  onboarding_id?: string;
  order_id?: string;
  orderId?: string;
  expert_id?: string;
  expertId?: string;
  notes?: string;
}

// POST /api/admin/assignments
export async function POST(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const body: ManualAssignmentRequest = await req.json();

    const targetOrderId = body.order_id || body.orderId || body.onboarding_id;
    const targetExpertId = body.expert_id || body.expertId;

    if (!targetOrderId) {
      return NextResponse.json(
        { message: "order_id (or onboarding_id / orderId) is required" },
        { status: 400 }
      );
    }

    if (!targetExpertId) {
      return NextResponse.json(
        { message: "expert_id (or expertId) is required" },
        { status: 400 }
      );
    }

    const result = await assignOrderManually({
      orderId: targetOrderId,
      expertId: targetExpertId,
      adminUserId: gate.userId ?? undefined,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { message: result.reason ?? "Assignment could not be completed", assignment: (result as any).assignment },
        { status: 409 }
      );
    }

    return NextResponse.json({ assignment: result.assignment, success: true }, { status: 201 });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    return NextResponse.json({ message: error.message }, { status: statusCode });
  }
}
