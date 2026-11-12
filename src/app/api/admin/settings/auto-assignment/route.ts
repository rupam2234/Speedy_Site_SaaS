import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/helpers/requireRole";
import {
  getAutoAssignmentSetting,
  setAutoAssignmentSetting,
} from "@/lib/services/assignmentService";

export const runtime = "nodejs";

// GET /api/admin/settings/auto-assignment
export async function GET() {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const setting = await getAutoAssignmentSetting();
    return NextResponse.json(
      {
        enabled: setting.enabled,
        updatedAt: setting.updatedAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/settings/auto-assignment  { enabled: boolean }
export async function PATCH(req: NextRequest) {
  const gate = await requireRole(["admin"]);
  if (gate.response) return gate.response;

  try {
    const body = await req.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { message: "Field 'enabled' of type boolean is required" },
        { status: 400 }
      );
    }

    const updated = await setAutoAssignmentSetting(body.enabled, gate.userId ?? undefined);
    return NextResponse.json(
      {
        enabled: updated.enabled,
        updatedAt: updated.updatedAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
